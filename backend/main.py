import os, uvicorn, uuid
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from embeddings import embed_text, embed_texts
from utils import chunk_text
from vectorstore import VectorStore
from pathlib import Path
from PyPDF2 import PdfReader
from tempfile import TemporaryDirectory
from authenticate.models import User
from authenticate.auth import hash_password, create_access_token
from authenticate.dependencies import get_db
from sqlalchemy.orm import Session
from authenticate.auth import verify_password
from authenticate.schemas import SignupRequest, LoginRequest
from database import engine, Base
from authenticate.models import User, Conversation
from conversation.routes import router as conversation_router
from authenticate.models import Message, Conversation

# ------------------------------
# Environment & App Setup
# ------------------------------
load_dotenv()
app = FastAPI(title="Legal & Policy Assistant API")

# Optional: CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(conversation_router)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Persistent FAISS for preloaded legal corpus
VECTORSTORE_PATH = Path(
    os.getenv("VECTORSTORE_PATH", "vectorstore")
)

vectorstore = None  # Will be initialized on startup

# ------------------------------
# Pydantic Schemas
# ------------------------------
class PromptRequest(BaseModel):
    prompt: str

class TextRequest(BaseModel):
    text: str

class TextsRequest(BaseModel):
    texts: list[str]

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5

# ------------------------------
# Utility Functions
# ------------------------------
def extract_pdf_text(file) -> str:
    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def ask_model(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a legal assistant. Answer only using the provided context."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def build_prompt_with_history(
            conversation_id: int,
            user_question: str,
            db: Session,
            pdf_context: str = "",
            max_history: int = 10
        ) -> str:
            # Fetch last N messages
            messages = (
                db.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc())
                .limit(max_history)
                .all()
            )
            messages = reversed(messages)  # oldest first
            chat_history = "\n".join([f"{m.role}: {m.content}" for m in messages])

            # Combine chat history and PDF/global RAG context
            combined_context = "\n\n".join(filter(None, [chat_history, pdf_context]))

            prompt = f"""
        You are a helpful legal assistant. Answer only using the context below.

        Conversation + Context:
        {combined_context}

        Question:
        {user_question}

        Answer in clear, simple language suitable for a non-expert:


        Note : Summarize your answer in maximum to maximum 100 words because i am using OpenAI key And it has charges per tokens so please keep this in mind.
        """
            return prompt

def generate_ai_conversation_title(first_message: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Generate a short, clear conversation title "
                        "from the user's message. "
                        "Max 2 words. No punctuation. No quotes."
                    )
                },
                {
                    "role": "user",
                    "content": first_message
                }
            ],
            temperature=0.3,
            max_tokens=10
        )

        title = response.choices[0].message.content.strip()

        # ✅ Safety check
        if not title:
            raise ValueError("Empty title")

        return title

    except Exception:
        # ✅ Guaranteed safe fallback
        words = first_message.strip().split()
        if len(words) >= 2:
            return " ".join(words[:2]).capitalize()
        elif len(words) == 1:
            return words[0].capitalize()
        return "Conversation"

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)

# ------------------------------
# Startup Event
# ------------------------------
@app.on_event("startup")
def startup_load():
    global vectorstore
    vectorstore = VectorStore(str(VECTORSTORE_PATH))
    if vectorstore.index.ntotal == 0:
        print("⚠️ Warning: FAISS index is empty")
    else:
        print("✅ FAISS index loaded successfully")

# ------------------------------
# Endpoints
# ------------------------------
@app.get("/")
def root():
    return {"message": "Legal & Policy Assistant API is running!"}

@app.post("/authenticate/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User created successfully"}

@app.post("/authenticate/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.email)

    # ✅ Always create a new conversation on login
    new_convo = Conversation(
        user_id=user.id,
        title="New Conversation"
    )
    db.add(new_convo)
    db.commit()
    db.refresh(new_convo)

    return {
        "access_token": token,
        "token_type": "bearer",
        "full_name": user.full_name,
        "new_conversation_id": new_convo.id  # Optional: frontend can highlight it
    }


MAX_HISTORY = 10  # last N messages

@app.post("/ask/{conversation_id}")
def ask_with_history(
    conversation_id: int,
    prompt_request: PromptRequest,
    db: Session = Depends(get_db)
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # ✅ Generate AI title ONLY for first message
    if convo.title == "New Conversation":
        convo.title = generate_ai_conversation_title(prompt_request.prompt)
        db.add(convo)

    prompt = build_prompt_with_history(
        conversation_id,
        prompt_request.prompt,
        db
    )

    answer = ask_model(prompt)

    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=prompt_request.prompt
    )
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=answer
    )

    db.add_all([user_msg, assistant_msg])
    db.commit()

    return {"response": answer}

@app.post("/embed_text")
def get_embedding(request: TextRequest):
    embedding = embed_text(request.text)
    return {"embedding": embedding}

@app.post("/embed_texts")
def get_embeddings(request: TextsRequest):
    embeddings = embed_texts(request.texts)
    return {"embeddings": embeddings}

@app.post("/query_docs")
def query_docs(request: QueryRequest):
    if vectorstore.index.ntotal == 0:
        raise HTTPException(status_code=500, detail="VectorStore is empty")
    query_embedding = embed_text(request.query)
    results = vectorstore.search(query_embedding, top_k=request.top_k)
    return {"results": results}

@app.post("/ask_pdf/{conversation_id}")
async def ask_pdf_with_history(
    conversation_id: int,
    file: UploadFile = File(...),
    question: str = Form(...),
    top_k: int = Form(5),
    db: Session = Depends(get_db)
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # ✅ Generate AI title only once
    if convo.title == "New Conversation":
        convo.title = generate_ai_conversation_title(question)
        db.add(convo)


    # Extract PDF and create temporary FAISS
    pdf_text = extract_pdf_text(file.file)
    pdf_chunks = chunk_text(pdf_text)
    question_embedding = embed_text(question)

    if vectorstore.index.ntotal == 0:
        legal_context = ""
    else:
        global_results = vectorstore.search(question_embedding, top_k=top_k)
        legal_context = "\n\n".join(r['metadata']['text'] for r in global_results)

    with TemporaryDirectory() as tmpdir:
        temp_store = VectorStore(store_path=tmpdir)
        for chunk in pdf_chunks:
            temp_store.add_vector(embed_text(chunk), {"text": chunk})
        pdf_results = temp_store.search(question_embedding, top_k=top_k)
        pdf_context = "\n\n".join(r['metadata']['text'] for r in pdf_results)

    # Combine legal + PDF context
    combined_rag_context = "\n\n".join(filter(None, [legal_context, pdf_context]))

    # Build prompt including chat history + RAG context
    prompt = build_prompt_with_history(
        conversation_id,
        question,
        db,
        pdf_context=combined_rag_context
    )

    # Get model response
    answer = ask_model(prompt)

    # Store messages
    user_msg = Message(conversation_id=conversation_id, role="user", content=question)
    assistant_msg = Message(conversation_id=conversation_id, role="assistant", content=answer)
    db.add_all([user_msg, assistant_msg])
    db.commit()

    return {"answer": answer}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

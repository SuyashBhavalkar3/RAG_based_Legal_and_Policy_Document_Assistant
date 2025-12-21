from sentence_transformers import SentenceTransformer

model_name = "all-MiniLM-L6-v2"
model = SentenceTransformer(model_name)

def embed_text(text: str) -> list:
    embedding = model.encode(text, convert_to_tensor=False)
    return embedding.tolist()

def embed_texts(texts: list) -> list:
    embeddings = model.encode(texts, convert_to_tensor=False)
    return [e.tolist() for e in embeddings]
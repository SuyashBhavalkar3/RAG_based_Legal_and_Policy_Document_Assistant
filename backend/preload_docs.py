import os
from pathlib import Path
from PyPDF2 import PdfReader
import docx
from embeddings import embed_texts
from vectorstore import VectorStore

# Path to your docs folder
DOCS_DIR = Path("docs")  # adjust if needed
VECTORSTORE_PATH = Path("vectorstore")  # where vectors will be saved

# Chunk size (in words) for splitting documents
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

def load_pdf(file_path):
    text = ""
    reader = PdfReader(file_path)
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def load_docx(file_path):
    doc = docx.Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs])

def load_txt(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i + chunk_size]
        chunks.append(" ".join(chunk))
        i += chunk_size - overlap
    return chunks

def main():
    # Initialize vectorstore
    vectorstore = VectorStore(str(VECTORSTORE_PATH))

    # Loop over files in docs
    for file in DOCS_DIR.iterdir():
        if file.suffix.lower() == ".pdf":
            text = load_pdf(file)
        elif file.suffix.lower() == ".docx":
            text = load_docx(file)
        elif file.suffix.lower() == ".txt":
            text = load_txt(file)
        else:
            print(f"Skipping unsupported file: {file.name}")
            continue

        chunks = chunk_text(text)
        embeddings = embed_texts(chunks)

        for i, embedding in enumerate(embeddings):
            # store with metadata
            metadata = {
                "source": str(file),
                "chunk_index": i,
                "text": chunks[i]
            }
            vectorstore.add_vector(embedding, metadata)

        print(f"Processed {file.name} into {len(chunks)} chunks.")

    # Save vectorstore
    vectorstore.save()
    print("Vectorstore saved at:", VECTORSTORE_PATH)

if __name__ == "__main__":
    main()
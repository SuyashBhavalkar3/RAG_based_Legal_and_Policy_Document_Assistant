import os
from pathlib import Path
from PyPDF2 import PdfReader
import docx
import argparse
from embeddings import embed_texts
from vectorstore import VectorStore
from dotenv import load_dotenv
from utils import chunk_text

# Load environment variables from .env (for OpenAI keys, VECTORSTORE_PATH, etc.)
load_dotenv()

parser = argparse.ArgumentParser()
parser.add_argument(
    "--vectorstore-path",
    default=None,
    help="Path to save FAISS vectorstore (overrides env var VECTORSTORE_PATH)"
)
parser.add_argument(
    "--docs-dir",
    default=None,
    help="Directory containing documents (overrides env var DOCS_DIR)"
)
args = parser.parse_args()

# Use CLI args if provided, else fallback to env vars, else default
DOCS_DIR = Path(args.docs_dir or os.getenv("DOCS_DIR", "/app/docs"))
VECTORSTORE_PATH = Path(args.vectorstore_path or os.getenv("VECTORSTORE_PATH", "/app/vectorstore"))

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


# Make sure directories exist
DOCS_DIR.mkdir(parents=True, exist_ok=True)
VECTORSTORE_PATH.mkdir(parents=True, exist_ok=True)

def main():
    print(f"Loading documents from: {DOCS_DIR}")
    print(f"Saving vectorstore to: {VECTORSTORE_PATH}")

    vectorstore = VectorStore(str(VECTORSTORE_PATH))

    doc_files = list(DOCS_DIR.iterdir())
    if not doc_files:
        print("⚠️ No documents found in the docs directory. Exiting.")
        return

    for file in doc_files:
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
            metadata = {
                "source": str(file.name),
                "chunk_index": i,
                "text": chunks[i]
            }
            vectorstore.add_vector(embedding, metadata)

        print(f"✅ Processed {file.name} into {len(chunks)} chunks.")

    vectorstore.save()
    print(f"✅ Vectorstore saved at: {VECTORSTORE_PATH}")

if __name__ == "__main__":
    main()
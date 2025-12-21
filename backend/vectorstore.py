import faiss
import os
import pickle
from pathlib import Path
import numpy as np

class VectorStore:
    def __init__(self, store_path: str, embedding_dim: int = 384):
        self.store_path = Path(store_path)
        self.embedding_dim = embedding_dim
        self.vectors = []
        self.metadata = []

        self.index_path = self.store_path / "index.faiss"
        self.meta_path = self.store_path / "metadata.pkl"

        # FAISS index
        self.index = faiss.IndexFlatL2(embedding_dim)

        # Load index if files exist
        if self.index_path.exists() and self.meta_path.exists():
            self.load()
            print("✅ FAISS index loaded")
        else:
            print("⚠️ FAISS index not found, starting new index")

    def add_vector(self, vector: list, meta: dict):
        self.vectors.append(vector)
        self.metadata.append(meta)
        self.index.add(np.array([vector], dtype='float32'))

    def save(self):
        self.store_path.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "wb") as f:
            pickle.dump(self.metadata, f)

    def load(self):
        self.index = faiss.read_index(str(self.index_path))
        with open(self.meta_path, "rb") as f:
            self.metadata = pickle.load(f)

    def search(self, query_vector: list, top_k: int = 5):
        import numpy as np

        if self.index.ntotal == 0:
            return []

        query = np.array([query_vector], dtype='float32')
        distances, indices = self.index.search(query, top_k)
        results = []
        for idx, dist in zip(indices[0], distances[0]):
            results.append({
                "metadata": self.metadata[idx],
                "distance": float(dist)
            })
        return results

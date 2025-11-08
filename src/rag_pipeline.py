import re
import unicodedata
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_community.document_loaders import PyPDFLoader
from helper import get_pinecone_index
from logger import get_logger

logger = get_logger(__name__)

def clean_text(text: str) -> str:
    """Clean raw text before embedding."""
    if not isinstance(text, str):
        text = str(text)
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    text = re.sub(r"Page\s*\d+", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def build_rag_index(pdf_path="data/Tourism Of West Bengal.pdf", index_name="tourism"):
    """Build or update RAG index with cleaned PDF."""
    logger.info(f"📄 Loading {pdf_path}")
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    for doc in documents:
        doc.page_content = clean_text(doc.page_content)

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(documents)
    logger.info(f"✅ Split into {len(chunks)} chunks")

    embedding = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    index = get_pinecone_index(index_name)

    PineconeVectorStore.from_documents(documents=chunks, embedding=embedding, index=index)
    logger.info("✅ RAG index built successfully.")

def get_retriever(index_name="tourism"):
    """Return retriever for query-time search."""
    from langchain_pinecone import PineconeVectorStore
    embedding = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    index = get_pinecone_index(index_name)
    store = PineconeVectorStore(index=index, embedding=embedding)
    return store.as_retriever(search_type="similarity", search_kwargs={"k": 3})

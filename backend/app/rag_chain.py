import os
import hashlib
from typing import List, Dict
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()

load_dotenv()

# 1. Load Groq LLM
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama3-70b-8192"
)

# 2. Use HuggingFace for free embeddings
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# 3. Load vector DB from disk
vectordb = Chroma(persist_directory="chroma_db", embedding_function=embedding_model)

# 4. Text splitter for chunking transcripts
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

# Store processed video IDs to avoid reprocessing
processed_videos = set()

def extract_transcript_text(video_id: str) -> str:
    """Extract and combine transcript text from YouTube API"""
    try:
        fetched_transcript = ytt_api.fetch(video_id)
        
        # Extract text from all snippets and combine
        transcript_text = " ".join([snippet.text for snippet in fetched_transcript.snippets])
        
        # Clean up the text
        transcript_text = transcript_text.strip()
        
        print(f"Extracted transcript for video {video_id}: {len(transcript_text)} characters")
        return transcript_text
        
    except Exception as e:
        print(f"Error extracting transcript for video {video_id}: {e}")
        return ""

def chunk_transcript(transcript_text: str, video_id: str) -> List[Document]:
    """Chunk transcript into smaller pieces with metadata"""
    if not transcript_text:
        return []
    
    chunks = text_splitter.split_text(transcript_text)
    
    documents = []
    for i, chunk in enumerate(chunks):
        doc = Document(
            page_content=chunk,
            metadata={
                "video_id": video_id,
                "chunk_id": i,
                "source": f"youtube_video_{video_id}"
            }
        )
        documents.append(doc)
        print(documents)
    
    return documents

def store_transcript_embeddings(transcript_text: str, video_id: str):
    """Chunk transcript, create embeddings, and store in vector DB"""
    global processed_videos
    
    # Check if already processed
    if video_id in processed_videos:
        print(f"Video {video_id} already processed")
        return
    
    print(f"Processing transcript for video: {video_id}")
    
    # Chunk the transcript
    documents = chunk_transcript(transcript_text, video_id)
    
    if not documents:
        print(f"No transcript content to store for video {video_id}")
        return
    
    # Add to vector database
    vectordb.add_documents(documents)
    
    # Mark as processed
    processed_videos.add(video_id)
    
    print(f"Stored {len(documents)} chunks for video {video_id}")

def semantic_search(query: str, video_id: str = None, k: int = 3) -> List[Document]:
    """Perform semantic search on transcript chunks"""
    
    # If video_id provided, filter by it
    if video_id:
        filter_dict = {"video_id": video_id}
        docs = vectordb.similarity_search(
            query, 
            k=k, 
            filter=filter_dict
        )
    else:
        docs = vectordb.similarity_search(query, k=k)
    
    return docs

def create_context_prompt(query: str, context_docs: List[Document]) -> str:
    """Create a prompt with context and query"""
    context = "\n\n".join([doc.page_content for doc in context_docs])
    
    prompt = f"""Based on the following transcript context from a YouTube video, please answer the user's question. If the answer is not in the context, say so.

Context:
{context}

Question: {query}

Answer:"""
    
    return prompt

def run_rag_chain(query: str, video_id: str = None) -> str:
    """Main RAG pipeline: search and generate answer"""
    
    # 1. Perform semantic search
    relevant_docs = semantic_search(query, video_id)
    
    if not relevant_docs:
        return "I don't have any information about this video yet. Please make sure the transcript has been processed."
    
    # 2. Create context prompt
    prompt = create_context_prompt(query, relevant_docs)
    
    # 3. Generate answer using LLM
    try:
        response = llm.invoke(prompt)
        return response.content if hasattr(response, 'content') else str(response)
    except Exception as e:
        print(f"Error generating response: {e}")
        return "Sorry, I encountered an error while generating the response."

def process_video_query(query: str, video_id: str) -> str:
    """Complete pipeline: store transcript + answer query"""
    
    
   
        # Otherwise, extract from YouTube API
    transcript_text = extract_transcript_text(video_id)
    
    # 1. Store transcript embeddings if not already done
    if transcript_text and transcript_text.strip():
        store_transcript_embeddings(transcript_text, video_id)
    
    # 2. Run RAG chain
    answer = run_rag_chain(query, video_id)
    
    return answer
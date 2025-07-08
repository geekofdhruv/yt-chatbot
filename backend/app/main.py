from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.rag_chain import process_video_query, run_rag_chain
from pydantic import BaseModel

app = FastAPI()

# Allow frontend (Chrome extension) to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    video_id: str

@app.post("/ask")
async def ask_question(request: ChatRequest):
    """Main endpoint for RAG-based Q&A"""
    try:
        print(f"📩 Query: {request.query}")
        print(f"📹 Video ID: {request.video_id}")
        
        # Process the query using RAG
        answer = process_video_query(
            
            query=request.query,
            video_id=request.video_id
        )
        
        return {"response": answer}
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/extract")
async def extract_invoice(file: UploadFile = File(...)):
    return {"message": "Document extraction stub"}

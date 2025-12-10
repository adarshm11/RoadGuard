from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from PIL import Image
import io
import torch
import torch.nn as nn
from torchvision import transforms

# Define the same ImprovedCNN architecture
class ImprovedCNN(nn.Module):
    def __init__(self, num_classes=2):
        super(ImprovedCNN, self).__init__()
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        self.fc_input_size = 56 * 56 * 32
        self.dropout = nn.Dropout(0.5)
        self.fc1 = nn.Linear(self.fc_input_size, 128)
        self.fc2 = nn.Linear(128, num_classes)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.pool(self.relu(self.bn1(self.conv1(x))))
        x = self.pool(self.relu(self.bn2(self.conv2(x))))
        x = x.view(x.size(0), -1)
        x = self.dropout(x)
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
model = ImprovedCNN(num_classes=2).to(device)
model.load_state_dict(torch.load('../../improved_cnn_model.pth', map_location=device))
model.eval()

# Define transforms (use the same mean/std from training)
dataset_mean = [0.488, 0.483, 0.461]
dataset_std = [0.226, 0.220, 0.240]

transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=dataset_mean, std=dataset_std)
])

class_names = ['normal', 'pothole']

@app.get("/")
async def root():
    return {"message": "RoadGuard Pothole Detection API"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read and process image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert('RGB')
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    # Make prediction
    with torch.no_grad():
        output = model(image_tensor)
        probabilities = torch.softmax(output, dim=1)
        _, predicted = torch.max(output, 1)
    
    return {
        "prediction": class_names[predicted.item()],
        "confidence": probabilities[0][predicted.item()].item(),
        "probabilities": {
            class_names[i]: probabilities[0][i].item() 
            for i in range(len(class_names))
        }
    }

if __name__ == "__main__":
    uvicorn.run('main:app', host="0.0.0.0", port=8000, reload=True)


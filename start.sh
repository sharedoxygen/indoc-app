#!/bin/bash

# inDoc Startup Script

echo "🚀 Starting inDoc Document Management System..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama is not installed. LLM features will be disabled."
    echo "   To install: curl -fsSL https://ollama.com/install.sh | sh"
else
    # Check if Ollama is running
    if ! pgrep -x "ollama" > /dev/null; then
        echo "🤖 Starting Ollama..."
        ollama serve &
        sleep 2
    fi
    
    # Check if model is available
    if ! ollama list | grep -q "llama2"; then
        echo "📥 Pulling llama2 model (this may take a while)..."
        ollama pull llama2
    fi
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres elasticsearch weaviate redis

echo "⏳ Waiting for services to be healthy..."
sleep 15

# Check service health
echo "🔍 Checking service health..."

# PostgreSQL
if docker-compose exec -T postgres pg_isready -U indoc_user -d indoc > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL is not ready"
fi

# Elasticsearch
if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo "✅ Elasticsearch is ready"
else
    echo "⚠️  Elasticsearch is not ready"
fi

# Weaviate
if curl -s http://localhost:8080/v1/.well-known/ready > /dev/null 2>&1; then
    echo "✅ Weaviate is ready"
else
    echo "⚠️  Weaviate is not ready"
fi

# Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis is not ready"
fi

# Install backend dependencies if needed
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    echo "✅ Python environment exists"
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ Frontend dependencies installed"
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
source venv/bin/activate 2>/dev/null || true
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "🎨 Starting frontend development server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✨ inDoc is starting up!"
echo ""
echo "📍 Access points:"
echo "   Frontend:    http://localhost:5173"
echo "   Backend API: http://localhost:8000/api/v1/docs"
echo "   Swagger UI:  http://localhost:8000/api/v1/docs"
echo ""
echo "📝 Default credentials:"
echo "   Username: admin@indoc.local"
echo "   Password: admin123"
echo ""
echo "🛑 To stop all services, press Ctrl+C"
echo ""

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose down; exit" INT

# Keep script running
wait
# This here is for no gpu in a system

# # voice-backend/Dockerfile
# FROM python:3.10-slim

# # Install system dependencies
# RUN apt-get update && apt-get install -y \
#     ffmpeg \
#     libsndfile1 \
#     && rm -rf /var/lib/apt/lists/*

# # Set work directory
# WORKDIR /app

# # Copy requirements
# COPY requirements.txt .

# # Install Python dependencies
# RUN pip install --upgrade pip
# RUN pip install --no-cache-dir -r requirements.txt

# # Download pyannote models (if necessary)
# # This might require authentication tokens for some models
# # RUN python -c "from pyannote.audio import Pipeline; Pipeline.from_pretrained('pyannote/speaker-diarization')"

# # Copy application code
# COPY . .

# # Expose port
# EXPOSE 5000

# # Run the application
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]

# voice-backend/Dockerfile





#Below is for with a gpu
# voice-backend/Dockerfile

# Use an official CUDA runtime as a parent image
FROM nvidia/cuda:11.7.1-cudnn8-runtime-ubuntu20.04

# Set environment variables to prevent Python from writing pyc files and to enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set DEBIAN_FRONTEND to noninteractive to disable interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Set the time zone environment variable (modify as needed)
ENV TZ=Australia/Melbourne

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    tzdata \
    && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
    && dpkg-reconfigure --frontend noninteractive tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --upgrade pip
RUN pip3 install --no-cache-dir -r requirements.txt

# Set the working directory
WORKDIR /app

# Copy the application code
COPY . /app

# Expose the backend port
EXPOSE 5000

# Define the default command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]

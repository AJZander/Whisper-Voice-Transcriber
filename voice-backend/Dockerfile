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

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    tzdata \
    && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime \
    && dpkg-reconfigure --frontend noninteractive tzdata \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip3 install --upgrade pip

# Set the working directory
WORKDIR /app

# Copy requirements.txt first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Create the models directory
RUN mkdir -p /app/models

# Copy the application code
COPY . /app

# Expose the backend port
EXPOSE 5000

# Define the default command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]

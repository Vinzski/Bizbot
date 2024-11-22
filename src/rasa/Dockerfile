# Use a specific Rasa image from Docker Hub that matches your Rasa version
FROM rasa/rasa:3.6.20-full

# Switch to root user to perform installations
USER root

# Upgrade pip to the latest version
RUN pip install --upgrade pip

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Switch back to non-root user
USER 1001

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY . /app

# List files to verify
RUN ls -la /app

# Install any additional dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port for Rasa
EXPOSE 5005

# Start the Rasa server
CMD ["rasa", "run", "--enable-api", "--cors", "*"]

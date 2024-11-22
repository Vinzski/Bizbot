# Use an official Rasa image from Docker Hub
FROM rasa/rasa:latest

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY . /app

# List files to verify
RUN ls -la /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port for Rasa
EXPOSE 5005

# Start the Rasa server
CMD ["rasa", "run", "--enable-api", "--cors", "*"]

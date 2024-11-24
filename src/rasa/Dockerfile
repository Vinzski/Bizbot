# Use a specific Rasa image from Docker Hub that matches your Rasa version
FROM rasa/rasa:3.6.20-full

# Switch to root user to perform installations
USER root

# Set the working directory
WORKDIR /app

# Copy requirements.txt into the container
COPY . .

# Upgrade pip to the latest version
RUN pip install --no-cache-dir --upgrade pip

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Ensure all files in the working directory are accessible to non-root user
RUN chown -R 1001:1001 /app

# Switch back to non-root user
USER 1001  # Ensure this matches the non-root user UID used in the Rasa image

# Copy the rest of the application code
COPY . /app

# Expose the port for Rasa
EXPOSE 5005

# Start the Rasa server
CMD ["rasa", "run", "--enable-api", "--cors", "*", "--port", "8080"]

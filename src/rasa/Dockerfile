# Use a specific Rasa image from Docker Hub that matches your Rasa version
FROM rasa/rasa:3.6.20-full

# Switch to root user to perform installations
USER root

# Set the working directory
WORKDIR /app

# Copy only the requirements.txt file into the container
COPY requirements.txt /app/

# Install any additional dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Switch back to non-root user
USER 1001  # Replace with the correct UID if different

# Copy the rest of the application code into the container
COPY . /app

# Expose the port for Rasa
EXPOSE 5005

# Start the Rasa server
CMD ["rasa", "run", "--enable-api", "--cors", "*"]

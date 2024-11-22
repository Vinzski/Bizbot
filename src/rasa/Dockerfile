# Use a specific Rasa image that matches your project's Rasa version
FROM rasa/rasa:3.6.20-full

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

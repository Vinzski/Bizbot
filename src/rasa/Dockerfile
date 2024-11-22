FROM python:3.7-slim

# Install dependencies
RUN python -m pip install rasa

# Set the working directory
WORKDIR /app

# Copy the app files into the container
COPY . .

# Train the Rasa NLU model
RUN rasa train nlu

# Set the user to run the app
USER 1001

# Expose the required port
EXPOSE 8080

# Entry point for the container
ENTRYPOINT ["rasa"]

# Command to run the Rasa server with API enabled on port 8080
CMD ["run", "--enable-api", "--port", "8080"]

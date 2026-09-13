# InterviewWizz

InterviewWizz turns a job description and candidate CV into a tailored, structured interview plan using `gpt-5.6-terra`.

## Run locally

1. Copy `.env.example` to `.env` and replace `your_openai_api_key_here` with your OpenAI API key.
2. In PowerShell, load the values and start the app:

   ```powershell
   Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2] } }
   node server.js
   ```

3. Open `http://127.0.0.1:3000`.

The server sends data directly to the Responses API. The key never reaches the browser and response storage is disabled (`store: false`).

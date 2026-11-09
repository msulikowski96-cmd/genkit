secret "google_api_key" {}

config "genkit_model" {
  default = "gemini-2.5-flash"
}

build "app" {
  base = "node"
  command = "npm install"
  # Ship the repo root so ../webos-app/app is deployed too; the server serves it at /tv/.
  context = "../"
}

service "app" {
  build = build.app
  command = "npm run start"

  endpoint {
    public = true
  }

  env = {
    PORT = port
    GOOGLE_API_KEY = secret.google_api_key
    GENKIT_MODEL = config.genkit_model
  }

  dev {
    command = "npm run dev"
  }
}

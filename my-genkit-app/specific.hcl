secret "google_api_key" {}

config "genkit_model" {
  default = "gemini-2.5-flash"
}

build "app" {
  base = "node"
  command = "npm install"
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

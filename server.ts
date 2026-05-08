import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/auth/callback`
  );
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  app.use(express.json());
  app.use(
    cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "secret-key"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: "none",
    })
  );

  // Auth URL
  app.get("/api/auth/url", (req, res) => {
    try {
      const client = getOAuth2Client();
      const authUrl = client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
        prompt: "consent",
      });
      res.json({ url: authUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auth Callback
  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const client = getOAuth2Client();
      const { tokens } = await client.getToken(code as string);
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. You can close this window now.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Helper to extract tokens from header
  const getTokensFromHeader = (req: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        return JSON.parse(authHeader.substring(7));
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Get user profile
  app.get("/api/auth/me", async (req, res) => {
    const tokens = getTokensFromHeader(req);
    if (!tokens) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const client = getOAuth2Client();
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const userInfo = await oauth2.userinfo.get();
      res.json(userInfo.data);
    } catch (error) {
      res.status(401).json({ error: "Session expired" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });

  // Upload to Drive
  app.post("/api/drive/upload", async (req, res) => {
    const tokens = getTokensFromHeader(req);
    if (!tokens) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { fileName, fileContent, mimeType } = req.body;
    if (!fileName || !fileContent) {
      return res.status(400).json({ error: "Missing file data" });
    }

    try {
      const client = getOAuth2Client();
      client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: client });

      // First, check if folder exists, if not create one
      let folderId = "";
      const folderRes = await drive.files.list({
        q: "name='GramrAI' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id)",
      });

      if (folderRes.data.files && folderRes.data.files.length > 0) {
        folderId = folderRes.data.files[0].id!;
      } else {
        const createFolderRes = await drive.files.create({
          requestBody: {
            name: "GramrAI",
            mimeType: "application/vnd.google-apps.folder",
          },
          fields: "id",
        });
        folderId = createFolderRes.data.id!;
      }

      // Convert base64 back to buffer
      const buffer = Buffer.from(fileContent.split(",")[1] || fileContent, "base64");
      
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };
      const media = {
        mimeType: mimeType || "application/pdf",
        body: Readable.from(buffer),
      };

      const driveFile = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink",
      });

      res.json({ success: true, file: driveFile.data });
    } catch (error: any) {
      console.error("Drive upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

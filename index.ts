import express, { Request, Response } from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import bcrypt from "bcrypt";
import cors from "cors";

import SpotifyWebApi from "spotify-web-api-node";

dotenv.config();
const app = express();
app.use(cors());
app.use(morgan("combined"));

const scopes = ["user-read-recently-played"];
const state: string = process.env.HANDSHAKE_STATE || "";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SP_CLIENT_ID,
  clientSecret: process.env.SP_CLIENT_SECRET,
  redirectUri:
    process.env.NODE_ENV === "production"
      ? "https://spotify-lp-lambda.herokuapp.com/"
      : "http://localhost:9200/callback",
});

var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

const initAuth = async (code: string) => {
  try {
    const authData = await spotifyApi.authorizationCodeGrant(code);
    spotifyApi.setAccessToken(authData.body["access_token"]);
    spotifyApi.setRefreshToken(authData.body["refresh_token"]);
  } catch (error) {
    console.error("Error authenticating");
    console.error(error);
  }
};

const tokenRefresh = async () => {
  try {
    await spotifyApi.refreshAccessToken();
  } catch (error) {
    console.error("Error refreshing token");
    console.error(error);
  }
};

const getLastPlayed = async () => {
  try {
    const recentTracks = await spotifyApi.getMyRecentlyPlayedTracks({
      limit: 1,
    });
    return recentTracks.body.items;
  } catch (error) {
    console.error("Error fetching recent tracks");
    console.error(error);
    return error;
  }
};

app.get("/callback", async (req: Request, res: Response) => {
  await initAuth(String(req.query.code));
  res.send("Authenticated successfully");
});

app.get("/lp", async (req: Request, res: Response) => {
  await tokenRefresh();
  const tracks = await getLastPlayed();
  res.json(tracks);
});

app.get("/authenticate", async (req: Request, res: Response) => {
  const hash = process.env.PASS_HASH || "";
  if (!req.query.pass) {
    res.send("No pass provided");
    return;
  }

  if (bcrypt.compareSync(String(req.query.pass), hash)) {
    res.redirect(authorizeURL);
  } else {
    res.send("Pass authentication failed");
  }
});

app.get("/", async (req: Request, res: Response) => {
  await tokenRefresh();
  res.send(`
  Wanna hear a Cthulhu joke? 
  Never mind it's an old one`);
});

const port = process.env.PORT || 9200;

app.listen(port, () => {
  console.log(`Listening on ${port}`);
});

// bcrypt.hash("", 12).then((hash) => console.log("Hash - " + hash));

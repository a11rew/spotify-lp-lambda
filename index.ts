import express from "express";
import SpotifyWebApi from "spotify-web-api-node";
import dotenv from "dotenv";
import morgan from "morgan";

dotenv.config();

const app = express();
app.use(morgan("combined"));

const scopes = ["user-read-recently-played"];
const state: string = process.env.HANDSHAKE_STATE || "";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SP_CLIENT_ID,
  clientSecret: process.env.SP_CLIENT_SECRET,
  redirectUri: "http://localhost:9200/callback",
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
    const tokenData = await spotifyApi.refreshAccessToken();
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

app.get("/callback", async (req, res) => {
  await initAuth(String(req.query.code));
  res.send("Authenticated successfully");
});

app.get("/lp", async (req, res) => {
  await tokenRefresh();
  const tracks = await getLastPlayed();
  res.json(tracks);
});

app.get("/authenticate", async (req, res) => {
  res.redirect(authorizeURL);
});

app.get("/", async (req, res) => {
  await tokenRefresh();
  res.send(`
  Wanna hear a Cthulhu joke? 
  Never mind it's an old one`);
});

app.listen(9200, () => {
  console.log("Listening on 9200");
});

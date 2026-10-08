const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const GROUP_ID = "143326439";
const TARGET_ROLE_ID = "886692014";
const API_KEY = process.env.ROBLOX_API_KEY;

app.get("/", (req, res) => {
  res.send("Roblox Auto Rank Bot läuft.");
});

async function checkMembers() {
  try {
    const response = await fetch(
      `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships?maxPageSize=100`,
      {
        headers: {
          "x-api-key": API_KEY
        }
      }
    );

    if (!response.ok) {
      console.log("Roblox API Fehler:", response.status);
      return;
    }

    const data = await response.json();

    console.log("Mitglieder gefunden:", data.memberships?.length || 0);

  } catch (error) {
    console.log("Fehler:", error.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
  checkMembers();
  setInterval(checkMembers, 60000);
});

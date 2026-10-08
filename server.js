const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const GROUP_ID = "143326439";
const TARGET_ROLE_ID = "886692014";
const API_KEY = process.env.ROBLOX_API_KEY;

// Hier speichern wir Mitglieder, die wir bereits gesehen haben.
let knownMembers = new Set();
let initialized = false;

async function getMembers() {
  console.log("Prüfe Gruppe...");
  const members = new Map();
  let pageToken = "";

  try {
    do {
      let url =
        `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships?maxPageSize=100`;

      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const response = await fetch(url, {
        headers: {
          "x-api-key": API_KEY
        }
      });

      if (!response.ok) {
        console.log("Fehler beim Abrufen der Mitglieder:", response.status);
        console.log(await response.text());
        return null;
      }

      const data = await response.json();

      for (const membership of data.groupMemberships || data.memberships || []) {
        const id = membership.name || membership.membership;
        const role =
          membership.role?.name ||
          membership.role;

        if (id) {
          members.set(id, {
            membershipId: id,
            role: role
          });
        }
      }

      pageToken = data.nextPageToken || "";
    } while (pageToken);

    return members;
  } catch (error) {
    console.log("Fehler:", error.message);
    return null;
  }
}

async function rankMember(membershipId) {
  const url =
    `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships/${encodeURIComponent(membershipId)}:assignRole`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: `groups/${GROUP_ID}/roles/${TARGET_ROLE_ID}`
      })
    });

    if (!response.ok) {
      console.log(
        `Rang konnte nicht gesetzt werden (${membershipId}):`,
        response.status
      );
      console.log(await response.text());
      return false;
    }

    console.log(`Rang erfolgreich gesetzt: ${membershipId}`);
    return true;
  } catch (error) {
    console.log("Fehler beim Setzen des Rangs:", error.message);
    return false;
  }
}

async function checkMembers() {
  if (!API_KEY) {
    console.log("ROBLOX_API_KEY fehlt!");
    return;
  }

  const members = await getMembers();

  if (!members) return;

  // Beim allerersten Durchlauf nur den aktuellen Stand merken.
  // Dadurch werden nicht plötzlich alle bisherigen Mitglieder gerankt.
  if (!initialized) {
    knownMembers = new Set(members.keys());
    initialized = true;

    console.log(
      `Startbestand gespeichert: ${knownMembers.size} Mitglieder.`
    );

    return;
  }

  // Neue Mitglieder finden.
  for (const [membershipId] of members) {
    if (!knownMembers.has(membershipId)) {
      console.log(`Neues Mitglied gefunden: ${membershipId}`);

      await rankMember(membershipId);

      knownMembers.add(membershipId);
    }
  }

  // Mitglieder entfernen, die nicht mehr in der Gruppe sind.
  for (const oldMember of knownMembers) {
    if (!members.has(oldMember)) {
      knownMembers.delete(oldMember);
    }
  }
}

app.get("/", (req, res) => {
  res.send("Roblox Auto Rank Bot läuft.");
});

app.listen(PORT, () => {
  console.log(`Roblox Auto Rank Bot läuft auf Port ${PORT}`);

  checkMembers();

  // Alle 60 Sekunden nach neuen Mitgliedern schauen.
  setInterval(checkMembers, 60000);
});

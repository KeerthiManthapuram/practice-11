const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/")
        });
    }
    catch(e){
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

//API - 1

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1];
        }
        if (jwtToken === undefined){
            response.status(401);
            response.send("Invalid JWT Token");
        }else {
            jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
                if (error) {
                    response.status(401);
                    response.send("Invalid JWT Token");
                }else {
                    next();
                }
            });
        }
    }




app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);

    if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
    }else {
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
        if (isPasswordMatched === true) {
            const payload = { username : username};
            const jwtToken = jwt.sign(payload, "My_SECRET_KEY");
            response.send({jwtToken});
        }else {
            response.status(400);
            response.send("Invalid password");
        }
    }
});

//API - 2

app.get("/states/", authenticateToken, async(request, response) => {
    const getStatesQuery = `SELECT * FROM state;`;
    const dbStatesList = await db.all(getStatesQuery);
    response.send(dbStatesList);
});

//API - 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
    const { stateId } = request.params;
    const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
    const dbRequestedState = await db.get(getStateQuery);
    response.send(dbRequestedState);
});

//API - 4

app.post("/districts/", authenticateToken, async(request, response) => {
    const { districtName, stateId, cases, cured, active, deaths} = request.body;
    const createDistrictQuery = `INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES(
    '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
    await db.run(createDistrictQuery);
    response.send("District Successfully Added");
});

//API - 5

app.get("/districts/:districtId/", authenticateToken, async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
    const dbDistrict = await db.get(getDistrictQuery);
    response.send(dbDistrict);
});


//API - 6 

app.delete("/districts/:districtId/", authenticateToken, async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
});

//API - 7

app.put("/districts/:districtId/", authenticateToken, async (request, response) => {
    const { districtId } = request.params;
    const { districtName, stateId, cases, cured, active, deaths} = request.body;
    const updateDistrictQuery = `UPDATE district 
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;
    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
});



module.exports = app;


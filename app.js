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
        db = await open ({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/")
        })
    }
    catch(e){
        console.log(`DB Error: {e.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1];
        if (jwtToken === undefined){
            response.status(401);
            response.send("Invalid JWT Token");
        }else {
            jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, user) =>{
                if (error) {
                    response.status(401);
                    response.send("Invalid JWT Token");
                }else {
                    next();
                }
            })
        }
    }
};



app.post("/login/", authenticateToken, async (request, response) => {
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
            response.send("{jwtToken");
        }else {
            response.status(400);
            response.send("Invalid password");
        }
    }
});

module.exports = app;

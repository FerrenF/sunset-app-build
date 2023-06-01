// server/index.js

const CFG_PORT = 3003;
const CFG_PREFIX = "_";
const CFG_BASEPATH = "/mnt/sites/sunset-app/server/";

const path = require('path');
const express = require('express');

const PORT = process.env.PORT || CFG_PORT;
const util = require('util');
const app = express();
const fs = require('fs');

const cors = require("cors")
app.use(cors());
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

async function getDirectoryMeta(directory){
    try {
        const rfrom = CFG_BASEPATH + directory + "/META.json";
        const data = await fs.promises.readFile(rfrom).then(buffer => {
            return JSON.parse(buffer.toString());
        }).catch(error => {
            // Probably does not exist.
            console.log(error.message);
            process.exit(1);
            return 0;
        });
        return data;
    }
    catch(e){
        return {};
    }

}

function getImageDirectories(){
    return (fs.readdirSync(CFG_BASEPATH, {withFileTypes : true}))
        .filter((value)=>{
            return value.isDirectory() && value.name.substring(0,CFG_PREFIX.length)===CFG_PREFIX;
        });
}


function getImagesFromDirectory(directory){
    return (fs.readdirSync(CFG_BASEPATH+directory, {withFileTypes : true}))
        .filter((value)=>{
            return value.isFile() && value.name.endsWith("jpg");
        });
}



function initRoutes(){

    // A request to / in the server folder will return a listing of valid image directories. These directories are
    // indicated by an underscore in the first position.

    const dirListing = getImageDirectories();
    var promises = [];
    dirListing.forEach((value, index, array)=>{
        promises.push(getDirectoryMeta(value.name).then(
            result=>{
                array[index] = {...array[index], meta: result}
            }
        ));
    });
    Promise.all(promises).then(() =>{

        app.get("/", (req, res) => {
            res.json({ directories: "[ " +dirListing.map((value)=>{
                    let ob = value;
                    ob = {...ob, shortname: ob.name.substring(CFG_PREFIX.length)};
                    return JSON.stringify(ob);}
                ).join(",") + "]"})
            }
        );

        // Now lets set up the routes for the directories.
        dirListing.map((value)=>{
            const shortname = value.name.substring(CFG_PREFIX.length);
            const img = getImagesFromDirectory(value.name);

            //Host our image directories
            app.use(express.static("server"))

            app.get("/"+shortname, (req, res) => {
                res.json({...value, shortname: shortname, images: img})
            });
        })
        // All other GET requests not handled before will return our React app
        app.get('*', (req, res) => {
        //   res.sendFile(path.resolve(__dirname, '../', 'index.html'));
        });

    });

}

initRoutes();
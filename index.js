require('dotenv').config();
const express = require("express"),
      cors = require("cors"),
      app = express(),
      { MongoClient, paramToQuery, paramToRequest } = require("./utils");


      let whitelist = process.env.ALLOW;
      let corsOptionsDelegate = function (req, callback) {
        let corsOptions;
        if (whitelist.indexOf(req.header('Origin')) !== -1) {
          corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
        } else {
          corsOptions = { origin: false } // disable CORS for this request
        }
        callback(null, corsOptions) // callback expects two parameters: error and options
      }

     let router = require("express").Router();

//app.use(cors(corsOptions));
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));   
app.use('/favicon.ico', express.static('api/favicon.ico'));

const uri = process.env.MONGO_URI,
      db = process.env.MONGO_DB,
      PORT = process.env.PORT || 8080,
      accessCollections = process.env.ACCESS_COLLECTIONS;

async function getAPI(param,query) {

   const client = new MongoClient(uri,{ useUnifiedTopology: true, useNewUrlParser: true});
   if (!client) return;

  try {
    let cursor=[];
    if(accessCollections.indexOf(param.collection) != -1) {
   await client.connect();    
    const  database = client.db(db),
          Collection = database.collection(param.collection),
          paramQuery = paramToQuery(param),
          options = {
            sort: {sira:1},
            projection: { _id: false, filtre:false, sira:false },
          };

         cursor = await Collection.find({ aktif:true, ...paramQuery }).project(options.projection).sort(options.sort).toArray(),
        pageData = {}, templates = [], n = 0, itemobj = {}, result = {};

        if (param.collection=="target" && Object.keys(param).length > 1 ) {

            for (const item of cursor.reverse()) {
              itemobj = await database.collection(item.collection).findOne({ id:item.pid, aktif:item.aktif }, options).then((i) => {
                if (!i.template || i.template=="") i.template = item.collection;
                templates.push(i.template);
                return i;
                });
                if (n > 0)
                pageData.parent.push(itemobj);
                else
              pageData = {...itemobj,parent:[]};
            n++
          }
          pageData.template = (templates.filter((r, e, c) => c.indexOf(r) === e).reverse().join('-')).toLowerCase();
          pageData = JSON.parse(JSON.stringify(pageData)); cursor.reverse();
        result = { page:pageData }
      }
      if (param.collection=="target" && Object.keys(param).length == 1 ) { 
        cursor = []; result = {page:{template:"index"}}
      }


    cursor = JSON.parse(JSON.stringify(cursor));
  }
  else {cursor = []; result={}; }
  return { data:{ items:cursor }, ...result };

 } 
 catch (err) { 
   console.log(err)
 }
  finally { await client.close() }    
}

router.get("*", cors(corsOptionsDelegate), function (req, res,next) {
    const {param,query} = paramToRequest(req);
    if(accessCollections.indexOf(param.collection) != -1) 
      getAPI(param,query).then(data => res.send(data));
      else
      res.send({ data:{ items:[] } });


});

app.use("/", router).listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});




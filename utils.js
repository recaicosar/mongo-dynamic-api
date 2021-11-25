const { MongoClient,ObjectId } = require("mongodb");

const renameKeys = (obj, newKeys) => {
    const keyValues = Object.keys(obj).map(key => {
      const newKey = newKeys[key] || key;
      return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
  }

  const isType = (v) => {
  
    let result="string";
     if (isNumeric(v)) result = "integer";
     if (isDate(v)) result ="date";
     if (Array.isArray(v)) result ="array";
     if (isObjectId(v)) result ="objectId";
  
     return result;
  
  }

const isNumeric = (n) => (!isNaN(parseFloat(n)) && isFinite(n)),
      isObjectId = (v) => (ObjectId.isValid(v) && v.length===24 && typeof v === "string"),
      isDate = (v) => (!(!isNaN(v) || isNaN(new Date(v).getDate())));

const objectRegulator = fn => {
        const iter = v => v && typeof v === 'object'
        ? Array.isArray(v)
        ? v.map(iter)
        : Object.fromEntries(Object.entries(v).map(([k, v]) => [k, iter(v, fn)]))
        : fn(v);
    return iter;
    },
      tasks = (v) => {
        let value = (isNumeric(v)) ? parseInt(v) : v; //  ID
            value = (value === v && isDate(v)) ? new Date(v) : value;  // ISO Date
            value = (isObjectId(v)) ? ObjectId.createFromHexString(v) : value; // ObjectId
        //value = (Array.isArray(v)) ? {'$in':v} : value;  // ISO Date
        return value;

    };

const paramToQuery = (param) => {

    param = Object.assign({}, param);
    delete param.collection;
    const typeName = { "string" : "url", "integer" : "id", "objectId" : "_id", "date" : "date","array":"url" };
    const newName = {"id" : typeName[isType(param.id)]}
    param = renameKeys(param,newName);
    param = objectRegulator(v => tasks(v))(param);
    for (const [key, value] of Object.entries(param)) 
      if (Array.isArray(value)  && value.length>1)  param[key] = {'$in':value}

      return param;

},
  paramToRequest = (req,lang) => {
    let languages = lang;
    let params = req.params[0];
    
    urlParams = params
      .replace(/^.*:\/\//i, '')
      .split('/')
      .filter(n => n);


    
    let firstPath = urlParams[0];
      let lng = languages.items.find(({code, iso}) => ((code.toLowerCase() === firstPath.toLowerCase() || iso.toLowerCase() === firstPath.toLowerCase())))          
          if (!lng) 
      lng = languages.items.find(({ initial }) => initial);
    let dbPrefix = (lng.hasOwnProperty('prefix')) ? lng.prefix : lng.iso;
    dbPrefix = (dbPrefix !== "") ? `_${dbPrefix}` : dbPrefix;

    params = urlParams.filter(item => lng.iso.toLowerCase() !==item.toLowerCase())
      .map((item, i) => { return { [(i == 0) ? "collection" : "id"]: item } });


    let newObj = {};
    params.forEach(item => {
      for (const [key, value] of Object.entries(item)) 
            (Object.keys(newObj).indexOf(key)<0) ?
                Object.assign(newObj, {[key]: [value]}) : 
                newObj[key].push(value);
    });
  
      for (const [key, value] of Object.entries(newObj))  
      (value.length == 1) && (newObj[key] = value[0])

      return { dbPrefix, param : newObj, query : req.query }
}

  module.exports ={
      MongoClient,
      paramToQuery,
      paramToRequest
    };
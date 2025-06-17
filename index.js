const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// middleWare
app.use(cors());
app.use(express.json());


app.get('/',async(req,res)=>{
    res.send('KnowHive is Running....')
})

app.listen(port,()=>{
    console.log(`KnowHive Running on port ${port}`);
})
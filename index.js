const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// dotenv requirement
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3000;

// middleWare
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@durjoys-db.smvgnqx.mongodb.net/?retryWrites=true&w=majority&appName=Durjoys-DB`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const articlesCollection = client.db('knowHive').collection('articles');


        // Getting All Articles
        app.get('/articles', async (req, res) => {
            const cursor = await articlesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        // Getting user Specific articles
        app.get('/idArticles',async(req,res)=>{
            const userEmail = req.query.email;
            const query = {
                email : userEmail
            } 
            const result = await articlesCollection.find(query).toArray();
            res.send(result);
        })

        // Getting id specific Articles

        app.get('/articles/:id', async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ error: 'Invalid article ID format' });
            }
            const query = { _id: new ObjectId(id) };
            console.log(query);
            const result = await articlesCollection.findOne(query);
            res.send(result);

        });


        app.get('/recentArticles', async (req, res) => {
            try {
                const recentArticles = await articlesCollection
                    .find({})
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .toArray();
                res.send(recentArticles);
            } catch (error) {
                console.error('Error fetching recent articles:', error);
                res.status(500).send({ error: 'Failed to fetch recent articles.' });
            }
        });





        // Getting the articles by category
        app.get('/articles/category/:categoryName', async (req, res) => {
            const category = decodeURIComponent(req.params.categoryName);
            const articles = await articlesCollection.find({ category }).toArray();
            res.send(articles);
        })


        // Posting New Article
        app.post('/articles', async (req, res) => {
            const newArticle = req.body;
            if (typeof newArticle.createdAt === 'string') {
                newArticle.createdAt = new Date(newArticle.createdAt);
            } else if (!newArticle.createdAt) {
                newArticle.createdAt = new Date();
            }
            console.log(newArticle);
            const result = await articlesCollection.insertOne(newArticle);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send('KnowHive is Running....')
})







app.listen(port, () => {
    console.log(`KnowHive Running on port ${port}`);
})
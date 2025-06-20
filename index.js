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
        const commentsCollection = client.db('knowHive').collection('comments');


        // Getting All Articles
        app.get('/articles', async (req, res) => {
            const cursor = await articlesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        // Getting user Specific articles
        app.get('/myArticles', async (req, res) => {
            const userEmail = req.query.email;
            const query = {
                email: userEmail
            }
            const result = await articlesCollection.find(query).toArray();
            res.send(result);
        })

        // Getting id specific Articles

        app.get('/articles/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
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


        // Getting top contributors
        app.get('/top-contributors', async (req, res) => {
            try {
                const contributors = await articlesCollection.aggregate([
                    {
                        $group: {
                            _id: '$author_id',
                            username: { $first: '$username' },
                            authorImage: { $first: '$authorImage' },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 4 }
                ]).toArray();

                res.json(contributors);
            } catch (error) {
                console.error('Error fetching top contributors:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        // Trending Tags Endpoint
        app.get('/trending-tags', async (req, res) => {
            try {
                const tags = await articlesCollection.aggregate([
                    { $unwind: '$tags' },
                    { $group: { _id: '$tags', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 3 }
                ]).toArray();
                res.json(tags);
            } catch (err) {
                res.status(500).json({ error: 'Failed to fetch tags' });
            }
        });


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


        // Deleting Id specific data
        app.delete('/articles/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await articlesCollection.deleteOne(query);
            res.send(result);

        })

        // updating id specific data
        app.patch('/articles/:id', async (req, res) => {
            const id = req.params.id;
            const changes = req.body;
            const query = { _id: new ObjectId(id) };
            const update = { $set: changes };
            const result = await articlesCollection.updateOne(query, update);
            res.send(result);
        })

        // Posting Likes
        app.patch('/articles/:id/like', async (req, res) => {
            const postId = req.params.id;
            console.log(postId);
            const query = { _id: new ObjectId(postId) };
            const update = { $inc: { likes: 1 } }
            const result = await articlesCollection.updateOne(query, update);
            res.send(result);
        });



        // Comment Related Apis
        // Getting All Comments
        app.get('/comments', async (req, res) => {
            const cursor = await commentsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        // Getting article_id specific comments
        app.get('/comments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { article_id: id };
            const result = await commentsCollection.find(query).toArray();
            res.send(result);
        })



        // Posting Comments
        app.post('/comments', async (req, res) => {
            const commentData = req.body;
            const result = await commentsCollection.insertOne(commentData);
            res.send(result);
        })

        // // Posting Likes
        // app.patch('/comments/:id', async (req, res) => {
        //     const postId = req.params.id;

        //     const result = await commentsCollection.updateOne(
        //         { article_id: postId },
        //         { $inc: { likes: 1 } }
        //     );
        //     res.send(result);
        // });

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
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import dotenv from "dotenv";
import { Pool } from "pg";
dotenv.config();
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: 5432,
});
pool
    .connect()
    .then(() => console.log("Connected to the database"))
    .catch((err) => console.error("Database connection error", err));
// pool.query("SELECT NOW()", (err, res) => {
//   if (err) {
//     console.error("Error executing query", err.stack);
//   } else {
//     console.log("Query result:", res.rows[0]);
//   }
// });
// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `
  type Staff {
    id: Int
    name: String
    role: String
  }

  type Marchents {
    id: Int
    email: String
    phone: String
    address: String
  }

  type Query {
    staff: [Staff]
    marchents: [Marchents]
  }
`;
// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {
    Query: {
        staff: async () => {
            const result = await pool.query("SELECT * FROM staff");
            return result.rows;
        },
        marchents: async () => {
            const result = await pool.query("SELECT * FROM marchents");
            return result.rows;
        },
    },
};
// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
    typeDefs,
    resolvers,
});
// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
});
console.log(`🚀  Server ready at: ${url}`);

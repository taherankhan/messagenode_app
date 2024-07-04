const { buildSchema } = require("graphql");

module.exports = buildSchema(`

    type Post{
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type AuthData {
        token:  String!
        userId:   String!
    }

    type PostData {
        posts:[Post!]!
        totalPosts: Int!
    }

    input UserInputData {
        email: String!
        name: String!
        password: String!
    }

    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }


    type RootMutation{
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(id:ID!, postInput: PostInputData): Post!
        deletePost(id:ID!): Boolean
        updateStatus(status:String!): User! 
    }

    type RootQuery{
        login(email:String!,password:String!): AuthData!
        getPosts(page: Int):PostData!
        getPost(id:ID!): Post!
        user: User!
    }

    schema {
        query:RootQuery
        mutation: RootMutation
    }

`);

// ! means required
// Type defines the structure of data returned from a query, while Input defines the structure of data passed to a mutation in GraphQL.
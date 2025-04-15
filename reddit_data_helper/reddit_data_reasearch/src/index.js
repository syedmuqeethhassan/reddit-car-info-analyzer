import { searchSubreddit, fetchPostComments } from "./redditCalls.js";
import fs from 'fs/promises';
import { sendFile } from './sendToBackend.js';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

import dotenv from 'dotenv';
dotenv.config();

// Store summary data globally
global.summaryData = null;

// Function to save data to a file
async function saveDataToFile(data, filename) {
    try {
        // Create a directory for output if it doesn't exist
        await fs.mkdir('../output', { recursive: true });
        
        // Write the data to a JSON file
        await fs.writeFile(`../output/${filename}`, JSON.stringify(data, null, 2));
        console.log(`✅ Data successfully saved to ../output/${filename}`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving data to file:`, error);
        return false;
    }
}

// Main function to fetch posts and their comments
async function performSearch(keyword, subreddit = "whatcarshouldibuy", limit = 4, sort = "relevance") {
    const outputFilename = `result.json`;
    
    console.log(`Searching r/${subreddit} for "${keyword}"...`);

    const posts = await searchSubreddit(keyword, subreddit, limit, sort);

    if (posts.length === 0) {
        console.log(`No posts found in r/${subreddit} matching "${keyword}".`);
        return {
            keyword,
            subreddit,
            fetchDate: new Date().toISOString(),
            posts: []
        };
    }

    console.log(`\nFound ${posts.length} posts in r/${subreddit} matching "${keyword}"\n`);
    
    // Create a data structure to hold all posts and comments
    const allData = {
        keyword,
        subreddit,
        fetchDate: new Date().toISOString(),
        posts: []
    };
    
    // Process each post
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const postData = { ...post };

        console.log(`\nPOST ${i + 1}: ${post.title}`);
        console.log(`URL: ${post.url}`);
        console.log(`Author: ${post.author} | Score: ${post.score} | Comments: ${post.num_comments}`);
        console.log(`Posted: ${new Date(post.created).toLocaleString()}`);
        
        // Show truncated post content if available
        if (post.selftext && post.selftext !== "[No content]") {
            const preview = post.selftext.length > 150 
                ? post.selftext.substring(0, 150) + "..." 
                : post.selftext;
            console.log(`Content: ${preview}`);
        }

        if (!post.id) {
            console.error(`❌ Skipping post ${i + 1} - ID is undefined`);
            continue;
        }

        // Fetch comments with improved function
        console.log(`Fetching comments...`);
        const comments = await fetchPostComments(post.id, 15, 3);
        
        console.log(`Fetched ${comments.length} comments with nested replies`);
        
        // Add comments to the post data
        postData.comments = comments;
        allData.posts.push(postData);

        // Display sample comments with improved formatting
        if (comments.length > 0) {
            console.log("\nTOP COMMENTS:");
            comments.slice(0, 5).forEach((comment, idx) => {
                console.log("\n" + "-".repeat(40)); // Separator for readability
                
                // Display comment with proper formatting
                console.log(`COMMENT ${idx + 1}:`);
                console.log(`Author: ${comment.author} | Score: ${comment.score}`);
                console.log(`${comment.text}`);
                
                if (comment.replies.length > 0) {
                    console.log(`\nReplies (${comment.replies.length}):`);
                    
                    // Show top 2 replies if available
                    comment.replies.slice(0, 2).forEach((reply, replyIdx) => {
                        console.log(`\n  Reply ${replyIdx + 1}:`);
                        console.log(`  Author: ${reply.author} | Score: ${reply.score}`);
                        console.log(`  ${reply.text}`);
                    });
                    
                    // Indicate if there are more replies
                    if (comment.replies.length > 2) {
                        console.log(`\n  ... and ${comment.replies.length - 2} more replies`);
                    }
                } else {
                    console.log("\nNo replies to this comment");
                }
            });
        }

        console.log("\n" + "=".repeat(60)); // Post separator
    }
    
    // Save all data to a file
    await saveDataToFile(allData, outputFilename);
    
    console.log("\nSending file to Python for AI summary generation...");
    try {
        // Send file to Python and wait for response
        const summaryData = await sendFile();
        console.log("✅ Summary generated successfully");
        return summaryData; // Return the summary instead of posts data
    } catch (error) {
        console.error("❌ Failed to generate summary:", error.message);
        return allData; // Fallback to returning original data
    }
}

// API endpoint to handle searches
app.post('/api/search', async (req, res) => {
    console.log("Received request at /api/search endpoint");
    try {
        const { keyword } = req.body;
        
        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }
        
        // Optional parameters with defaults
        const subreddit = req.body.subreddit || 'whatcarshouldibuy';
        const limit = req.body.limit || 4;
        const sort = req.body.sort || 'relevance';
        
        console.log(`Processing search for "${keyword}" in r/${subreddit}`);
        
        // Perform search and get summary data
        const summaryData = await performSearch(keyword, subreddit, limit, sort);
        
        // Return the summary to React
        res.json({
            success: true,
            keyword,
            summary: summaryData.summary,
            sourceFile: summaryData.source_file,
            fetchDate: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error processing search:', error);
        res.status(500).json({ 
            success: false,
            error: 'An error occurred while processing your search' 
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API endpoint available at http://localhost:${PORT}/api/search`);
});

// For backwards compatibility, you can still run a direct search
// if no command line args, it starts the server
// if argument provided, it runs the search with that keyword
if (process.argv.length > 2) {
    const keyword = process.argv[2];
    performSearch(keyword).catch(error => {
        console.error("Error in search function:", error);
    });
}
# GraphQL Integration - Fetching LeetCode Data

## What is GraphQL?

**GraphQL** is a query language for APIs. Instead of fixed endpoints, you ask for exactly what data you need.

### GraphQL vs REST

| Feature | REST | GraphQL |
|---------|------|---------|
| **Endpoints** | Many fixed URLs | One URL |
| **Request** | GET /users/123 | POST with query |
| **Response** | Full object | Only what you ask for |
| **Over-fetching** | Get unwanted data | No extra data |

**Example**:
```rest
# REST: Get EVERYTHING about user
GET /api/users/john_doe
# Returns: { name, email, phone, address, profile_pic, ... }

# GraphQL: Get ONLY what you need
POST /graphql
Query: { user { name email } }
# Returns: { name, email }
```

---

## LeetCode GraphQL API

LeetCode exposes a GraphQL API at:
```
https://leetcode.com/graphql
```

### How to Query It

All queries are sent as POST requests with GraphQL syntax.

```javascript
const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
    },
    body: JSON.stringify({
        query: `
            query {
                // Your query here
            }
        `,
        variables: {
            // Variables to pass to query
        }
    })
});

const data = await response.json();
```

---

## Mammon's GraphQL Implementation

All GraphQL logic is in `services/leetcode.js`:

```javascript
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

// Generic function to make GraphQL requests
async function graphqlRequest(query, variables) {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify({ query, variables })
    });
    
    const data = await response.json();
    return data.data;
}
```

---

## GraphQL Queries Used in Mammon

### Query 1: Get User Profile

**File**: `services/leetcode.js`

```javascript
const USER_PROFILE_QUERY = `
    query getUserProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                realName
                ranking
                userAvatar
            }
            submitStatsGlobal {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
            userCalendar {
                streak
            }
        }
    }
`;
```

### What This Asks For

| Field | What It Returns |
|-------|----------------|
| `username` | The LeetCode username |
| `realName` | Full name from profile |
| `ranking` | Global ranking position |
| `userAvatar` | Avatar image URL |
| `acSubmissionNum` | Problems solved by difficulty |
| `streak` | Current solving streak |

### How to Use It

```javascript
const profile = await graphqlRequest(USER_PROFILE_QUERY, {
    username: 'john_doe'
});

// Result structure:
{
    matchedUser: {
        username: 'john_doe',
        profile: {
            realName: 'John Doe',
            ranking: 5000,
            userAvatar: 'https://...'
        },
        submitStatsGlobal: {
            acSubmissionNum: [
                { difficulty: 'Easy', count: 50 },
                { difficulty: 'Medium', count: 30 },
                { difficulty: 'Hard', count: 5 }
            ]
        },
        userCalendar: {
            streak: 7
        }
    }
}
```

---

### Query 2: Get Recent Submissions

```javascript
const RECENT_SUBMISSIONS_QUERY = `
    query getRecentSubmissions($username: String!, $limit: Int!) {
        recentSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
        }
    }
`;
```

### What This Asks For

| Field | What It Returns |
|-------|----------------|
| `title` | Problem name (e.g., "Two Sum") |
| `titleSlug` | URL-friendly name (e.g., "two-sum") |
| `timestamp` | When submission was made |
| `statusDisplay` | "Accepted", "Wrong Answer", etc. |
| `lang` | Programming language used |

### How to Use It

```javascript
const submissions = await graphqlRequest(
    RECENT_SUBMISSIONS_QUERY,
    {
        username: 'john_doe',
        limit: 5
    }
);

// Result structure:
{
    recentSubmissionList: [
        {
            title: 'Two Sum',
            titleSlug: 'two-sum',
            timestamp: '1708598400',
            statusDisplay: 'Accepted',
            lang: 'python3'
        },
        {
            title: 'Add Two Numbers',
            titleSlug: 'add-two-numbers',
            timestamp: '1708512000',
            statusDisplay: 'Accepted',
            lang: 'javascript'
        }
        // ... more submissions
    ]
}
```

---

## Using GraphQL in Commands

### Example: `/stats` Command

**File**: `commands/leetcode/stats.js`

```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser } from '../../database/queries.js';
import { 
    getUserProfile, 
    getRecentSubmissions 
} from '../../services/leetcode.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View LeetCode statistics'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            // 1. Get which LeetCode user is linked to this Discord user
            const linkedUser = getUser(interaction.user.id, interaction.guild.id);
            
            if (!linkedUser) {
                await interaction.editReply('You haven\'t linked a LeetCode account yet!');
                return;
            }
            
            // 2. Fetch user profile via GraphQL
            const profile = await getUserProfile(linkedUser.username);
            
            // 3. Fetch recent submissions via GraphQL
            const submissions = await getRecentSubmissions(
                linkedUser.username, 
                5  // Get 5 recent submissions
            );
            
            // 4. Process the data
            const easyCount = profile.acSubmissionNum
                .find(x => x.difficulty === 'Easy')?.count || 0;
            const mediumCount = profile.acSubmissionNum
                .find(x => x.difficulty === 'Medium')?.count || 0;
            const hardCount = profile.acSubmissionNum
                .find(x => x.difficulty === 'Hard')?.count || 0;
            
            // 5. Create pretty embed
            const embed = new EmbedBuilder()
                .setTitle(`${profile.username}'s LeetCode Stats`)
                .setThumbnail(profile.avatar)
                .addFields(
                    {
                        name: 'Ranking',
                        value: `#${profile.ranking}`,
                        inline: true
                    },
                    {
                        name: 'Solved',
                        value: `${easyCount + mediumCount + hardCount}`,
                        inline: true
                    },
                    {
                        name: 'Streak',
                        value: `${profile.streak} 🔥`,
                        inline: true
                    },
                    {
                        name: 'By Difficulty',
                        value: `Easy: ${easyCount}\nMedium: ${mediumCount}\nHard: ${hardCount}`
                    }
                );
            
            // 6. Send response
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error(error);
            await interaction.editReply('Error fetching stats!');
        }
    }
};
```

---

## How GraphQL Queries Work

### Step-by-Step Breakdown

#### 1. Define the Query

```javascript
const USER_PROFILE_QUERY = `
    query getUserProfile($username: String!) {
        // ^ Query name        ^ Variable (username is required String)
        matchedUser(username: $username) {
            // ^ Field to query  ^ Pass in the username variable
            username
            profile {
                realName
                ranking
            }
            // Only ask for fields we need
        }
    }
`;
```

#### 2. Send Variables

```javascript
const variables = {
    username: 'john_doe'
};

const body = JSON.stringify({
    query: USER_PROFILE_QUERY,
    variables: variables
});
```

#### 3. Make Request

```javascript
const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
    },
    body: body
});
```

#### 4. Parse Response

```javascript
const json = await response.json();
const user = json.data.matchedUser;

console.log(user.username);      // 'john_doe'
console.log(user.profile.ranking); // 5000
```

---

## GraphQL Syntax Explained

### Required vs Optional Variables

```javascript
// Required: must provide value
query getUserProfile($username: String!) {
    // ^ The ! means required
}

// Optional: can omit
query getSubmissions($username: String, $limit: Int) {
    // No ! = optional
}
```

### Nested Fields

```javascript
query {
    matchedUser(username: $username) {
        // Level 1: matchedUser
        username
        profile {
            // Level 2: profile (nested inside matchedUser)
            realName
            ranking
            userAvatar
        }
        submitStatsGlobal {
            // Another nested object
            acSubmissionNum {
                // Another nested object
                difficulty
                count
            }
        }
    }
}
```

### Arrays

```javascript
recentSubmissionList(username: $username, limit: $limit) {
    // ^ Returns an array of submissions
    title
    timestamp
    // Each submission will have these fields
}
```

---

## Error Handling in GraphQL

### Check for Errors in Response

```javascript
async function graphqlRequest(query, variables) {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify({ query, variables })
    });
    
    const result = await response.json();
    
    // Check for GraphQL errors
    if (result.errors) {
        console.error('GraphQL Error:', result.errors);
        throw new Error(result.errors[0].message);
    }
    
    // Check for missing data
    if (!result.data) {
        throw new Error('No data returned');
    }
    
    return result.data;
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "User not found" | Username doesn't exist | Validate username before querying |
| "Request failed" | Network issue | Retry or check internet |
| "Query too complex" | Too many fields requested | Simplify query |

---

## Mammon's Complete Service File

**File**: `services/leetcode.js`

Mammon uses **four** GraphQL queries:

| Query | Purpose |
|-------|---------|
| `USER_PROFILE_QUERY` | Get user stats (ranking, solved count, streak) |
| `RECENT_SUBMISSIONS_QUERY` | Get recent problem submissions |
| `DAILY_PROBLEM_QUERY` | Get today's Daily Challenge |
| `PROBLEM_DETAIL_QUERY` | Get a problem's difficulty by slug |

```javascript
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const USER_PROFILE_QUERY = `
    query getUserProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                realName
                ranking
                userAvatar
            }
            submitStatsGlobal {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
            userCalendar {
                streak
            }
        }
    }
`;

const RECENT_SUBMISSIONS_QUERY = `
    query getRecentSubmissions($username: String!, $limit: Int!) {
        recentSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
        }
    }
`;

async function graphqlRequest(query, variables) {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify({ query, variables })
    });
    
    const result = await response.json();
    
    if (result.errors) {
        throw new Error(result.errors[0].message);
    }
    
    return result.data;
}

export async function getUserProfile(username) {
    const data = await graphqlRequest(USER_PROFILE_QUERY, { username });
    const user = data.matchedUser;
    
    if (!user) {
        return null;
    }
    
    // Transform the response into a simpler format
    return {
        username: user.username,
        realName: user.profile.realName,
        ranking: user.profile.ranking,
        avatar: user.profile.userAvatar,
        stats: user.submitStatsGlobal.acSubmissionNum,
        streak: user.userCalendar.streak
    };
}

export async function getRecentSubmissions(username, limit = 5) {
    const data = await graphqlRequest(RECENT_SUBMISSIONS_QUERY, { 
        username, 
        limit 
    });
    return data.recentSubmissionList;
}
```

---

## Testing GraphQL Manually

### Using curl

```bash
curl -X POST https://leetcode.com/graphql \
  -H "Content-Type: application/json" \
  -H "Referer: https://leetcode.com" \
  -d '{
    "query": "query { matchedUser(username: \"john_doe\") { username profile { ranking } } }"
  }'
```

### Using GraphQL Clients

- **GraphQL Playground**: Web-based editor
- **Postman**: REST/GraphQL testing
- **Insomnia**: Similar to Postman

---

## Rate Limiting

LeetCode might have rate limits on their GraphQL API.

### Best Practices

```javascript
// Cache results when possible
const cache = new Map();

async function getCachedProfile(username) {
    // Return cached if available
    if (cache.has(username)) {
        return cache.get(username);
    }
    
    // Otherwise fetch and cache
    const profile = await getUserProfile(username);
    cache.set(username, profile);
    
    // Clear cache after 10 seconds
    setTimeout(() => cache.delete(username), 10000);
    
    return profile;
}
```

---

## Summary

| Concept | What It Does |
|---------|-------------|
| **GraphQL** | Query language for APIs |
| **Query** | Request specific data from API |
| **Variables** | Pass parameters to queries |
| **Mutation** | Modify data (not used in Mammon) |
| **`graphqlRequest()`** | Helper function to make requests |
| **`getUserProfile()`** | Get LeetCode user stats |
| **`getRecentSubmissions()`** | Get recent solved problems |
| **`getDailyProblem()`** | Get today's Daily Challenge |
| **`getProblemDifficulty()`** | Get a problem's difficulty by slug |

---

## Next Steps

- **Want to store this data?** → [Database System](./7-database-system.md)
- **Need to use profile in commands?** → [Command System](./3-command-system.md)
- **Curious how it all connects?** → [Project Architecture](./2-project-architecture.md)
- **How does the poller use these queries?** → [Polling & Scheduling System](./8-polling-system.md)


async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password' })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        // Look for common error patterns in Next.js error page
        const errorMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) || text.match(/<div[^>]*class="error"[^>]*>([\s\S]*?)<\/div>/i);
        if (errorMatch) {
            console.log('Error found in HTML:', errorMatch[1]);
        } else {
            console.log('Full Response (first 2000 chars):', text.substring(0, 2000));
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

test();

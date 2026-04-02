# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Auth Smoke Test >> Login >> fills form and submits login
- Location: e2e/smoke.spec.ts:120:9

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/app/
Received string:  "http://localhost:3000/login"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    14 × unexpected value "http://localhost:3000/login"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "404"
  - heading "This page wandered off." [level=1] [ref=e5]
  - paragraph [ref=e6]: It happens to the best of us. Let's get you back to somewhere useful.
  - link "Take me home" [ref=e7] [cursor=pointer]:
    - /url: /
```

# Test source

```ts
  28  |     test('shows validation error when business name is empty', async ({
  29  |       page,
  30  |     }) => {
  31  |       await page.goto('/register');
  32  | 
  33  |       await page.getByRole('button', { name: /create account/i }).click();
  34  | 
  35  |       await expect(
  36  |         page.getByText(/what's your business called/i),
  37  |       ).toBeVisible();
  38  |     });
  39  | 
  40  |     test('shows validation error when email is empty', async ({ page }) => {
  41  |       await page.goto('/register');
  42  | 
  43  |       await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
  44  |       await page.getByRole('button', { name: /create account/i }).click();
  45  | 
  46  |       await expect(
  47  |         page.getByText(/we'll need your email/i),
  48  |       ).toBeVisible();
  49  |     });
  50  | 
  51  |     test('shows validation error when password is too short', async ({
  52  |       page,
  53  |     }) => {
  54  |       await page.goto('/register');
  55  | 
  56  |       await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
  57  |       await page.getByLabel(/email/i).fill(TEST_EMAIL);
  58  |       await page.getByLabel(/password/i).fill('short');
  59  |       await page.getByRole('button', { name: /create account/i }).click();
  60  | 
  61  |       await expect(
  62  |         page.getByText(/at least 8 characters/i),
  63  |       ).toBeVisible();
  64  |     });
  65  | 
  66  |     test('fills form and submits registration', async ({ page }) => {
  67  |       await page.goto('/register');
  68  | 
  69  |       await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
  70  |       await page.getByLabel(/email/i).fill(TEST_EMAIL);
  71  |       await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  72  |       await page.getByRole('button', { name: /create account/i }).click();
  73  | 
  74  |       // Successful registration redirects to onboarding (/welcome)
  75  |       await expect(page).toHaveURL(/\/welcome/, { timeout: 10_000 });
  76  |     });
  77  | 
  78  |     test('has a link to the login page', async ({ page }) => {
  79  |       await page.goto('/register');
  80  | 
  81  |       const signInLink = page.getByRole('link', { name: /sign in/i });
  82  |       await expect(signInLink).toBeVisible();
  83  |       await expect(signInLink).toHaveAttribute('href', '/login');
  84  |     });
  85  |   });
  86  | 
  87  |   test.describe('Login', () => {
  88  |     test('renders the login page with all form fields', async ({ page }) => {
  89  |       await page.goto('/login');
  90  | 
  91  |       await expect(page.getByText('Welcome back.')).toBeVisible();
  92  |       await expect(page.getByLabel(/email/i)).toBeVisible();
  93  |       await expect(page.getByLabel(/password/i)).toBeVisible();
  94  |       await expect(
  95  |         page.getByRole('button', { name: /sign in/i }),
  96  |       ).toBeVisible();
  97  |     });
  98  | 
  99  |     test('shows validation error when email is empty', async ({ page }) => {
  100 |       await page.goto('/login');
  101 | 
  102 |       await page.getByRole('button', { name: /sign in/i }).click();
  103 | 
  104 |       await expect(
  105 |         page.getByText(/what's your email/i),
  106 |       ).toBeVisible();
  107 |     });
  108 | 
  109 |     test('shows validation error when password is empty', async ({ page }) => {
  110 |       await page.goto('/login');
  111 | 
  112 |       await page.getByLabel(/email/i).fill('someone@example.com');
  113 |       await page.getByRole('button', { name: /sign in/i }).click();
  114 | 
  115 |       await expect(
  116 |         page.getByText(/you'll need your password/i),
  117 |       ).toBeVisible();
  118 |     });
  119 | 
  120 |     test('fills form and submits login', async ({ page }) => {
  121 |       await page.goto('/login');
  122 | 
  123 |       await page.getByLabel(/email/i).fill(TEST_EMAIL);
  124 |       await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  125 |       await page.getByRole('button', { name: /sign in/i }).click();
  126 | 
  127 |       // Successful login redirects to the app dashboard
> 128 |       await expect(page).toHaveURL(/\/app/, { timeout: 10_000 });
      |                          ^ Error: expect(page).toHaveURL(expected) failed
  129 |     });
  130 | 
  131 |     test('has a link to get started (register)', async ({ page }) => {
  132 |       await page.goto('/login');
  133 | 
  134 |       const getStartedLink = page.getByRole('link', {
  135 |         name: /get started/i,
  136 |       });
  137 |       await expect(getStartedLink).toBeVisible();
  138 |       await expect(getStartedLink).toHaveAttribute('href', '/welcome');
  139 |     });
  140 |   });
  141 | });
  142 | 
```
// Generates a plausible-but-clearly-synthetic profile for warming inboxes.
// Pools intentionally mix common Western names + generic locations to avoid
// impersonating a real, identifiable individual.

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Cameron', 'Drew', 'Emerson', 'Finley', 'Hayden', 'Kendall', 'Logan',
  'Parker', 'Reese', 'Rowan', 'Sage', 'Skyler', 'Devon', 'Harper', 'Jamie',
  'Noel', 'Phoenix',
];

const LAST_NAMES = [
  'Carter', 'Bennett', 'Hayes', 'Reed', 'Walker', 'Brooks', 'Cole',
  'Foster', 'Gray', 'Hart', 'James', 'Kerr', 'Lane', 'Mason', 'Nash',
  'Owens', 'Pratt', 'Quinn', 'Reid', 'Sloan', 'Tate', 'Vance', 'Wells',
  'Yates', 'Zane',
];

const COUNTRIES = [
  { country: 'United States', state: 'California', city: 'San Diego', postal: '92101' },
  { country: 'United States', state: 'New York', city: 'Brooklyn', postal: '11201' },
  { country: 'United States', state: 'Texas', city: 'Austin', postal: '78704' },
  { country: 'United States', state: 'Illinois', city: 'Chicago', postal: '60601' },
  { country: 'United States', state: 'Washington', city: 'Seattle', postal: '98101' },
  { country: 'Canada', state: 'Ontario', city: 'Toronto', postal: 'M5V 2T6' },
  { country: 'Canada', state: 'British Columbia', city: 'Vancouver', postal: 'V6B 1A1' },
  { country: 'United Kingdom', state: 'England', city: 'London', postal: 'EC1A 1BB' },
  { country: 'Australia', state: 'New South Wales', city: 'Sydney', postal: '2000' },
  { country: 'Germany', state: 'Berlin', city: 'Berlin', postal: '10115' },
];

const COMPANIES = [
  'Northwind Labs', 'Bluefin Studio', 'Stellar Works', 'Quartz Group',
  'Pinecrest Co.', 'Tessera Digital', 'Harbor & Co.', 'Riverline',
  'Linden Studio', 'Granite Logic',
];

const JOB_TITLES = [
  'Product Manager', 'Software Engineer', 'Marketing Lead', 'Designer',
  'Data Analyst', 'Operations Manager', 'Content Strategist',
  'Account Manager', 'UX Researcher', 'Consultant',
];

const GENDERS = ['male', 'female', 'nonbinary', 'prefer not to say'];

export function generateFakeProfile() {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const loc = pick(COUNTRIES);
  const age = randomInt(24, 48);
  const dob = randomDob(age);

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    age: String(age),
    dob,
    gender: pick(GENDERS),
    country: loc.country,
    state: loc.state,
    city: loc.city,
    postalCode: loc.postal,
    phone: randomUSPhone(),
    company: pick(COMPANIES),
    jobTitle: pick(JOB_TITLES),
    website: '',
  };
}

// Fills only blank fields in an existing profile, returns the patch.
export function fillBlanksWithFake(existing) {
  const fake = generateFakeProfile();
  const patch = {};
  for (const [key, value] of Object.entries(fake)) {
    if (!existing[key] || existing[key].trim() === '') {
      patch[key] = value;
    }
  }
  return patch;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomDob(age) {
  const today = new Date();
  const year = today.getFullYear() - age;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomUSPhone() {
  // 555 exchange = reserved-for-fiction range, never assigned to real numbers.
  const area = randomInt(200, 989);
  const line = randomInt(1000, 9999);
  return `+1 (${area}) 555-${line}`;
}

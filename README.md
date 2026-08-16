# EV Charging App

An Expo mobile app for EV charging and parking reservations. The app helps users sign in, add vehicles, calculate the best booking window, reserve an available bay, view a live session, cancel an active booking, and review past sessions.

## High-Level Architecture

The app is built with Expo, React Native, TypeScript, and Supabase.

The code is split into a few main areas:

- `app/` contains the screens and navigation routes.
- `components/` contains reusable UI pieces like the active session card and profile menu.
- `services/` contains the business logic and all Supabase calls.
- `context/` contains app-wide state, especially authentication.
- `config/` contains pricing data used by the algorithm.
- `supabase/` contains the database migration files.

## App Flow

The app flow is:

1. The user opens the app.
2. The root layout checks whether the user is signed in.
3. If not signed in, the user is sent to sign in or sign up.
4. After signing in, the user lands in the tab-based home area.
5. The user adds a vehicle if needed.
6. The user enters arrival and departure time and battery information.
7. The algorithm calculates the best charging or parking plan.
8. The app loads available bays from Supabase.
9. The user selects a bay and confirms the booking.
10. The booking is stored in Supabase and the user is redirected to the live session screen.
11. The live session screen tracks the active booking and allows cancellation.
12. Completed or cancelled sessions appear in the history screen.

## Authentication Architecture

Authentication is handled by `context/auth-context.tsx`. This is the central auth layer for the app.

The auth context stores:

- `session`
- `user`
- `profile`
- `initializing`

It also exposes helper actions:

- `signIn`
- `signUp`
- `signOut`
- `refreshProfile`

The root layout in `app/_layout.tsx` wraps the whole app in `AuthProvider`. That means every screen can read the current user without fetching auth state again from Supabase manually.

This is important because:

- screens can use `useAuth()` to access the current user and profile
- the app can redirect unauthenticated users automatically
- profile data is loaded once and reused across screens

## Screen Structure

### Sign In and Sign Up

The auth screens are in `app/(auth)/sign-in.tsx` and `app/(auth)/sign-up.tsx`.

These screens collect credentials and call the auth service:

- sign in uses Supabase password login
- sign up creates a new user and stores the display name in profile metadata

### Home Screen

The main home screen is `app/(root)/(tabs)/index.tsx`.

It mainly shows:

- a welcome header
- the active session card

### Booking Screen

The booking entry screen is `app/(root)/booking-form.tsx`.

This is where the user:

- chooses a vehicle
- enters arrival and departure times
- enters battery information for charging bookings
- sends the data to the booking results screen

### Booking Results Screen

The results screen is `app/(root)/booking-results.tsx`.

This screen:

- runs the booking algorithm
- shows the recommended charging or parking plan
- loads bay availability from Supabase
- lets the user choose a bay
- creates the final booking

### Live Session Screen

The live session screen is `app/(root)/live-session.tsx`.

It shows:

- booking status
- state of charge
- charging window
- reservation window
- estimated price

It also handles cancellation and recalculates the cost when the session ends early.

### History Screen

The history screen is `app/(root)/history.tsx`.

It loads the user’s completed and cancelled bookings and shows:

- session date
- start and end times
- vehicle
- slot name
- booking type
- total cost

## Service Layer

The app’s important logic is in the service files.

### `services/auth.service.ts`

This wraps Supabase auth calls:

- sign up
- sign in
- sign out
- get current session
- get current user
- get and update profile data

### `services/vehicle.service.ts`

This handles user vehicles:

- list vehicles for the signed-in user
- add a new vehicle

### `services/booking.service.ts`

This is one of the most important files. It handles:

- checking bay availability
- creating bookings
- cancelling bookings

It also calls a database RPC named `sync_booking_statuses`.

### `services/algorithm.service.ts`

This is the core pricing and optimization engine. It calculates:

- parking-only cost
- charging plus parking cost
- optimal charging start and end window
- partial charging behavior if there is not enough time
- early cancellation cost

### `config/pricing.ts`

This stores the price grid used by the algorithm. There are two 48-slot daily grids:

- one for charging
- one for parking

Each value represents the price for a 30-minute block.

## Database Architecture

The migration file is `supabase/migrations/20260718000000_core_tables.sql`.

It creates the main tables:

- `vehicles`
- `slots`
- `bookings`
- `telemetry`

It also enables row level security and adds policies.

### Manual Supabase Changes

Some database updates were added directly in the Supabase SQL editor instead of the checked-in migration file.

These include:

- extra booking columns that were added later in the live database
- the `sync_booking_statuses` RPC used by the booking service
- a `pg_cron` job that updates booking and slot state every minute

### Manual Database Setup

The following `pg_cron` job was added directly in Supabase and is not included in the repo migration file. It keeps booking and slot status synchronized with time:

```sql
SELECT cron.unschedule('manage-booking-states-job')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'manage-booking-states-job');

SELECT cron.schedule(
   'manage-booking-states-job',
   '* * * * *',
   $cron$
      UPDATE public.bookings
      SET status = 'active'
      WHERE start_time <= NOW()
         AND end_time > NOW()
         AND status = 'reserved';

      UPDATE public.bookings
      SET status = 'completed'
      WHERE end_time <= NOW()
         AND status IN ('reserved', 'active');

      UPDATE public.slots
      SET status = 'occupied'
      WHERE id IN (SELECT slot_id FROM public.bookings WHERE status = 'active')
         AND status = 'available';

      UPDATE public.slots
      SET status = 'available'
      WHERE status = 'occupied'
         AND id NOT IN (SELECT slot_id FROM public.bookings WHERE status = 'active');
   $cron$
);
```

The cron job keeps the database in sync with time constraints by:

- marking reserved bookings as active when their start time is reached
- marking active or reserved bookings as completed when the end time passes
- marking slots as occupied for active bookings
- freeing occupied slots when no active booking uses them anymore

### Tables

#### Vehicles

Each vehicle belongs to one user.

#### Slots

Each bay or charging slot has:

- name
- status
- max output amps
- created at time

#### Bookings

Each booking stores:

- user
- vehicle
- slot
- booking type
- status
- target SOC
- start and end time
- charge window
- total cost
- charging state

## Detailed Algorithm Explanation

This is the most important part to explain carefully.

The algorithm lives in `services/algorithm.service.ts`.

Its job is to take:

- arrival time
- departure time
- charge window
- current battery percentage
- target battery percentage
- charger speed
- battery capacity

and turn that into the cheapest sensible plan.

### 1. Time Conversion

The algorithm works in minutes, not clock strings.

It uses:

- `timeToMinutes("14:30") -> 870`
- `minutesToTime(870) -> "14:30"`

This makes the math easier because the whole day becomes a 0 to 1439 minute range.

### 2. Price Grids

The app does not use a single flat rate.

Instead, the day is split into 48 half-hour segments:

- 48 entries for charging prices
- 48 entries for parking prices

The helper `getMinuteByMinutePrices()` expands those 30-minute block prices into minute-by-minute arrays of length 1440.

That means the algorithm can ask for the price at a specific minute and optimize a time window precisely.

### 3. Parking Only

If the user selects parking only, the logic is simple:

1. Convert arrival and departure times to minutes.
2. Read the parking price for every minute in that range.
3. Sum the prices.
4. Return start time, end time, parking cost, and total cost.

So in parking-only mode, the algorithm is just:

total parking fee = sum of all per-minute parking rates between arrival and departure.

### 4. Charging Plus Parking

This is the smart part.

The app needs to decide:

- how long charging will take
- when charging should happen
- how much of the stay is charging versus idle parking
- what the cheapest charging window is

The function is `calculateChargeAndPark()`.

#### Step 1: Estimate charging time

It calculates how much battery energy is needed:

- `socNeeded = targetSoc - currentSoc`
- `mahNeeded = (socNeeded / 100) * batteryCapacity`

Then it estimates charging speed:

- `CHARGER_SPEED_MAH_PER_HOUR = maxOutputAmps * 1000`

So if the charger is 2.5 amps, the model treats that as about 2500 mAh per hour.

Then it estimates charging minutes:

- minutes needed = energy needed / charger speed converted to minutes

This gives the rough duration needed to reach the target SOC.

#### Step 2: Handle partial charging

If the booking window is too short, the algorithm cannot reach the target battery percentage.

In that case:

- it shortens the charging time to fit the available parking time
- it calculates the achievable SOC instead
- it marks the result as partial

This is why the UI can warn:

“Not enough parked time for a full charge. Recommending partial charge.”

#### Step 3: Find the cheapest charging window

The booking has a fixed arrival and departure window, but charging can happen anywhere inside it.

The algorithm compares two per-minute price arrays:

- charging price
- parking price

Then it computes a delta array:

- delta = charging price - parking price

This tells the algorithm how much extra cost each minute of charging adds compared with just parking.

Why do this?

Because the stay always has some base parking cost, and the charging part adds extra cost. The algorithm wants to place the charging block where that extra cost is smallest.

The intuition is easy to see with a small example.

Suppose we have a 5-minute stay and the parking cost for each minute is different: 1 dollar, 2 dollars, 3 dollars, 4 dollars, and 5 dollars. If we replaced one of those minutes with charging that costs 6 dollars, we would choose to replace the 5-dollar minute, because that gives the smallest increase in cost. In delta form, that is `charging cost - parking cost`, so the smallest delta is `6 - 5 = 1`.

Now take another 5-minute range where the parking prices go the other way:

- Minute 1: 5 dollars
- Minute 2: 4 dollars
- Minute 3: 3 dollars
- Minute 4: 2 dollars
- Minute 5: 1 dollar

If the charging prices for those same minutes are 1, 2, 3, 4, and 5 dollars, then the deltas are:

- Minute 1: `1 - 5 = -4`
- Minute 2: `2 - 4 = -2`
- Minute 3: `3 - 3 = 0`
- Minute 4: `4 - 2 = 2`
- Minute 5: `5 - 1 = 4`

So the best minute to charge would be minute 1, because it gives the smallest delta.

The same idea scales to a fixed-size window: instead of picking one minute, the algorithm chooses the window whose total delta is smallest.

#### Step 4: Sliding window search

The charging duration is fixed to `minutesNeeded`.

The algorithm then slides a window across the stay:

- start at arrival time
- move minute by minute until the latest valid position

For each possible start position, it calculates the sum of delta prices inside that window.

The window with the smallest delta sum is chosen as the best charging period.

The first window is computed once.

Each next window is updated by removing the old left minute and adding the new right minute.

This keeps it efficient instead of recalculating everything from scratch.

#### Step 5: Final cost split

Once the best charging window is chosen, the algorithm loops through the full stay and divides minutes into:

- charging minutes
- parking-only minutes

It computes:

- `finalChargingCost`
- `finalIdleParkingCost`

Then:

- `totalCost = chargingCost + parkingCost`

It also returns:

- `chargeStartTime`
- `chargeEndTime`
- `achievedSoc`
- whether the plan is partial
- how many charging minutes were needed

## Early Cancellation Algorithm

The app also calculates cost when a user cancels a session early.

That logic is in `calculateEarlyCancellation()`.

It works like this:

1. If cancellation happens before the booking starts, the user gets a full refund.
2. If cancellation happens after the booking starts, the algorithm computes the minutes already used.
3. For each elapsed minute:
   - if it was within the charging window, charge pricing is applied
   - otherwise parking pricing is applied
4. The final total is recalculated.
5. The refund is the original cost minus the recalculated final cost.

This lets the app show a settlement receipt when a session ends early.

## Live Session Behavior

The live session screen listens to real-time booking updates through Supabase channels.

That means:

- if the booking row changes in the database, the screen updates automatically
- the SOC display and status can stay current
- the user can cancel the session from the screen

The screen also uses a pulse animation when charging is active, which is just a visual indicator that energy is flowing.

## Getting Started

### Prerequisites

- Node.js installed on your machine
- An Expo Go app installed on your phone if you want to test on a real device
- A Supabase project with the required URL and anon key

### Clone the Repository

```bash
git clone <your-repo-url>
cd evchargingapp
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the project root and add your Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
```

### Start the Development Server

```bash
npx expo start
```

This opens the Expo developer tools and starts the Metro bundler.

### Test in Expo Go

1. Make sure your phone and computer are on the same network.
2. Open Expo Go on your phone.
3. Scan the QR code shown in the Expo developer tools or terminal.
4. The app should open on your device.

### Other Ways to Run

- Use an Android emulator from the Expo menu.
- Use an iOS simulator on macOS.
- Use a development build if you need native features not supported in Expo Go.

### After Setup

Once the app is running, you can:

- sign up or sign in
- add a vehicle
- create a booking
- view the live session screen
- cancel a session and see the receipt
- check booking history

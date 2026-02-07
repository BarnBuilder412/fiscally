
import sys
import os
import random
from datetime import datetime, timedelta
import asyncio
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.user import User, Transaction
from app.ai.context_manager import ContextManager

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_EMAIL = "demo@fiscally.app"
DEMO_PASSWORD = "password123"

def get_password_hash(password):
    return pwd_context.hash(password)

def setup_demo_user(db: Session):
    print(f"Setting up demo user: {DEMO_EMAIL}")
    
    # Check if user exists
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    
    if user:
        print("User exists. Resetting data...", end=" ")
        # Delete existing transactions
        db.query(Transaction).filter(Transaction.user_id == user.id).delete()
        
        # Reset JSONB fields
        user.profile = {}
        user.patterns = {}
        user.insights = {}
        user.goals = {}
        user.memory = {}
        print("Done.")
    else:
        print("Creating new user...", end=" ")
        user = User(
            email=DEMO_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            is_active=True,
            is_verified=True
        )
        db.add(user)
    
    # Set profile data
    user.profile = {
        "identity": {
            "name": "Demo User",
            "currency": "INR",
            "income_range": "75k_150k",
            "payday": 1
        },
        "preferences": {
            "notification_style": "proactive",
            "voice_enabled": True
        }
    }
    
    db.commit()
    db.refresh(user)
    print(f"User ready with ID: {user.id}")
    return user

def generate_transactions(db: Session, user: User):
    print("Generating 3 months of transaction history...")
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=90)
    
    transactions = []
    
    # 1. Recursive/Fixed Expenses (Rent, Utilities, Subscriptions)
    current_date = start_date
    while current_date <= end_date:
        # Rent (1st of month)
        if current_date.day == 1:
            transactions.append(create_txn(user.id, 25000, "Landlord", "housing", "Rent Payment", current_date))
        
        # Internet (5th)
        if current_date.day == 5:
            transactions.append(create_txn(user.id, 999, "JioFiber", "utilities", "Internet Bill", current_date))
            
        # Netflix (10th)
        if current_date.day == 10:
            transactions.append(create_txn(user.id, 649, "Netflix", "entertainment", "Subscription", current_date))
            
        # Gym (15th)
        if current_date.day == 15:
            transactions.append(create_txn(user.id, 2500, "Gold's Gym", "health", "Gym Membership", current_date))

        current_date += timedelta(days=1)

    # 2. Variable Daily Spending
    current_date = start_date
    while current_date <= end_date:
        # Coffee (Morning, ~60% chance)
        if random.random() < 0.6:
            hour = random.randint(8, 10)
            txn_date = current_date.replace(hour=hour, minute=random.randint(0, 59))
            transactions.append(create_txn(user.id, random.choice([150, 220, 280]), "Starbucks", "food", "Morning Coffee", txn_date))
            
        # Lunch (Afternoon, ~80% chance)
        if random.random() < 0.8:
            hour = random.randint(12, 14)
            txn_date = current_date.replace(hour=hour, minute=random.randint(0, 59))
            transactions.append(create_txn(user.id, random.randint(150, 400), "Swiggy", "food", "Lunch", txn_date))
            
        # Grocery (Weekly, ~20% chance any day)
        if random.random() < 0.15:
            hour = random.randint(17, 20)
            txn_date = current_date.replace(hour=hour, minute=random.randint(0, 59))
            transactions.append(create_txn(user.id, random.randint(800, 2500), "Zepto", "groceries", "Groceries", txn_date))
            
        # Transport (Uber/Ola, ~40% chance)
        if random.random() < 0.4:
            hour = random.randint(8, 20)
            txn_date = current_date.replace(hour=hour, minute=random.randint(0, 59))
            transactions.append(create_txn(user.id, random.randint(150, 500), "Uber", "transport", "Ride", txn_date))
            
        # Shopping (Weekend, ~30% chance on Sat/Sun)
        if current_date.weekday() >= 5 and random.random() < 0.3:
            hour = random.randint(14, 18)
            txn_date = current_date.replace(hour=hour, minute=random.randint(0, 59))
            transactions.append(create_txn(user.id, random.randint(1500, 5000), "Amazon", "shopping", "Shopping", txn_date))

        current_date += timedelta(days=1)
        
    # 3. Create "Late Night Food" Pattern (Bad Habit)
    # Order food between 11 PM and 2 AM on Fridays/Saturdays
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() >= 4: # Fri, Sat, Sun
            if random.random() < 0.7:
                hour = random.choice([23, 0, 1])
                day_offset = 1 if hour < 5 else 0
                txn_date = current_date.replace(hour=hour, minute=random.randint(0, 59)) + timedelta(days=day_offset)
                if txn_date <= end_date:
                    transactions.append(create_txn(user.id, random.randint(300, 800), "Zomato", "food", "Late Night Snack", txn_date))
        current_date += timedelta(days=1)
        
    # 4. Create Anomaly (Large purchase yesterday)
    yesterday = end_date - timedelta(days=1)
    anomaly_txn = create_txn(
        user.id, 
        25000, 
        "Apple Store", 
        "electronics", 
        "New AirPods Max", 
        yesterday.replace(hour=16, minute=30),
        is_anomaly=True,
        anomaly_reason="Unusual high spending for electronics category"
    )
    transactions.append(anomaly_txn)
    
    # Sort and add to DB
    transactions.sort(key=lambda x: x.transaction_at)
    for txn in transactions:
        db.add(txn)
    
    db.commit()
    print(f"Generated {len(transactions)} transactions.")

def create_txn(user_id, amount, merchant, category, note, date, is_anomaly=False, anomaly_reason=None):
    return Transaction(
        user_id=user_id,
        amount=str(amount), # Stored as string model
        currency="INR",
        merchant=merchant,
        category=category,
        note=note,
        source="manual",
        transaction_at=date,
        is_anomaly=is_anomaly,
        anomaly_reason=anomaly_reason
    )

async def setup_goals(db: Session, user: User, ctx: ContextManager):
    print("Setting up goals...")
    
    goals = [
        {
            "id": "vacation",
            "label": "Bali Trip",
            "target_amount": "150000",
            "target_date": (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"),
            "priority": 1,
            "icon": "airplane",
            "color": "#3B82F6"
        },
        {
            "id": "emergency",
            "label": "Emergency Fund",
            "target_amount": "100000",
            "target_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
            "priority": 2,
            "icon": "shield-checkmark",
            "color": "#22C55E"
        },
        {
            "id": "gadget",
            "label": "PlayStation 6",
            "target_amount": "60000",
            "target_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "priority": 3,
            "icon": "game-controller",
            "color": "#8B5CF6" # Purple
        }
    ]
    
    # Save goals to context
    await ctx.save_goals(str(user.id), goals)
    
    # Add saved amounts (Manual updates to simulate progress)
    # Vacation: On track (saved 40k)
    await ctx.update_goal_saved_amount(str(user.id), "vacation", 40000)
    
    # Emergency: Started (saved 10k)
    await ctx.update_goal_saved_amount(str(user.id), "emergency", 10000)
    
    # Gadget: Behind (saved 0)
    # No action needed, defaults to 0
    
    # Trigger progress calculation
    print("Calculating goal progress...")
    progress = await ctx.calculate_goal_progress(str(user.id))
    print(f"Goal progress calculated. {len(progress.get('goals', []))} goals active.")

async def main():
    db = SessionLocal()
    try:
        user = setup_demo_user(db)
        generate_transactions(db, user)
        
        ctx = ContextManager(db)
        await setup_goals(db, user, ctx)
        
        print("\n✅ Demo Data Setup Complete!")
        print(f"Login with: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())

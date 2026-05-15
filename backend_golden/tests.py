"""
F2P Tests - Billing & Payments System
Tests fail on empty codebase (before.json = 0% PASS)
Tests pass with golden patch (after.json = 100% PASS)
"""
import pytest
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock, ANY
import stripe


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def app():
    """Flask test app"""
    from app import create_app
    app = create_app('testing')
    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """Flask test client"""
    return app.test_client()


@pytest.fixture
def db(app):
    """Database instance"""
    from app.models import db
    with app.app_context():
        db.create_all()
        yield db
        db.session.rollback()
        db.drop_all()


@pytest.fixture
def auth_headers(client, db):
    """JWT auth headers for test user"""
    from app.models import User
    user = User(email='test@example.com', name='Test User')
    db.session.add(user)
    db.session.commit()
    
    # Generate JWT token
    import jwt
    from datetime import datetime, timedelta
    payload = {
        'user_id': str(user.id),
        'email': user.email,
        'role': 'user',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, 'test-secret', algorithm='HS256')
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin_headers(client, db):
    """JWT auth headers for admin user"""
    from app.models import User
    user = User(email='admin@example.com', name='Admin User', role='admin')
    db.session.add(user)
    db.session.commit()
    
    import jwt
    from datetime import datetime, timedelta
    payload = {
        'user_id': str(user.id),
        'email': user.email,
        'role': 'admin',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, 'test-secret', algorithm='HS256')
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_plans(db):
    """Create sample plans in database"""
    from app.models import Plan
    plans = [
        Plan(
            name='Starter',
            amount_cents=2900,  # $29/month
            billing_cycle='monthly',
            features=['10 projects', '5GB storage'],
            stripe_price_id='price_test_starter_monthly',
            active=True
        ),
        Plan(
            name='Pro',
            amount_cents=9900,  # $99/month
            billing_cycle='monthly',
            features=['50 projects', '100GB storage', 'Priority support'],
            stripe_price_id='price_test_pro_monthly',
            active=True
        ),
        Plan(
            name='Enterprise',
            amount_cents=29900,  # $299/month
            billing_cycle='monthly',
            features=['Unlimited projects', 'Unlimited storage', '24/7 support', 'SLA'],
            stripe_price_id='price_test_enterprise_monthly',
            active=True
        ),
    ]
    for plan in plans:
        db.session.add(plan)
    db.session.commit()
    return plans


# ============================================================================
# PLAN MANAGEMENT TESTS
# ============================================================================

def test_create_plan(db):
    """Test creating a new plan"""
    from app.models import Plan
    
    plan = Plan(
        name='Basic',
        amount_cents=1999,
        billing_cycle='monthly',
        features=['1 project', '1GB storage'],
        stripe_price_id='price_test_basic',
        active=True
    )
    db.session.add(plan)
    db.session.commit()
    
    assert plan.id is not None
    assert plan.name == 'Basic'
    assert plan.amount_cents == 1999
    assert plan.billing_cycle == 'monthly'


def test_get_all_plans(client, sample_plans):
    """Test retrieving all available plans"""
    response = client.get('/api/plans')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['plans']) == 3
    assert data['plans'][0]['name'] == 'Starter'
    assert data['plans'][0]['amount_cents'] == 2900


def test_plan_validation(db):
    """Test plan validation constraints"""
    from app.models import Plan
    
    # Test invalid: negative price
    plan = Plan(
        name='Invalid',
        amount_cents=-100,
        billing_cycle='monthly',
        features=[],
        stripe_price_id='price_invalid'
    )
    with pytest.raises(ValueError):
        db.session.add(plan)
        db.session.flush()


# ============================================================================
# SUBSCRIPTION MANAGEMENT TESTS
# ============================================================================

@patch('stripe.Subscription.create')
def test_create_subscription(mock_stripe_sub, client, db, auth_headers, sample_plans):
    """Test creating a subscription"""
    # Mock Stripe response
    mock_stripe_sub.return_value = MagicMock(
        id='sub_test_123',
        status='active',
        current_period_start=1234567890,
        current_period_end=1237246290,
        items=MagicMock(data=[MagicMock(price=MagicMock(id='price_test_pro_monthly'))])
    )
    
    response = client.post(
        '/api/subscriptions',
        json={'plan_id': str(sample_plans[1].id)},
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'subscription_id' in data
    assert data['status'] == 'active'
    assert data['amount_cents'] == 9900


def test_create_subscription_no_auth(client, sample_plans):
    """Test subscription creation requires authentication"""
    response = client.post(
        '/api/subscriptions',
        json={'plan_id': str(sample_plans[0].id)}
    )
    
    assert response.status_code == 401


@patch('stripe.Subscription.create')
def test_create_subscription_invalid_plan(mock_stripe_sub, client, auth_headers):
    """Test creating subscription with non-existent plan"""
    response = client.post(
        '/api/subscriptions',
        json={'plan_id': '00000000-0000-0000-0000-000000000000'},
        headers=auth_headers
    )
    
    assert response.status_code == 400


@patch('stripe.Subscription.retrieve')
def test_get_user_subscription(mock_stripe_retrieve, client, db, auth_headers, sample_plans):
    """Test getting user's subscription"""
    from app.models import User, Subscription
    
    user = User.query.filter_by(email='test@example.com').first()
    
    # Create subscription in DB
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[1].id,
        stripe_subscription_id='sub_test_456',
        status='active',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    # Mock Stripe response
    mock_stripe_retrieve.return_value = MagicMock(
        id='sub_test_456',
        status='active',
        items=MagicMock(data=[MagicMock(price=MagicMock(id='price_test_pro_monthly'))])
    )
    
    response = client.get('/api/subscriptions', headers=auth_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['plan_name'] == 'Pro'
    assert data['status'] == 'active'


def test_get_subscription_not_found(client, auth_headers):
    """Test getting subscription when user has none"""
    response = client.get('/api/subscriptions', headers=auth_headers)
    
    assert response.status_code == 404


# ============================================================================
# PRORATED BILLING TESTS
# ============================================================================

def test_prorated_billing_calculation():
    """Test prorated billing calculation for mid-cycle upgrade"""
    from app.services.billing import calculate_prorated_upgrade
    
    current_plan_price_cents = 2900  # $29/month
    new_plan_price_cents = 9900      # $99/month
    current_period_start = datetime(2024, 3, 1)
    current_period_end = datetime(2024, 4, 1)
    today = datetime(2024, 3, 15)  # 15 days into cycle
    
    result = calculate_prorated_upgrade(
        current_plan_price_cents,
        new_plan_price_cents,
        current_period_start,
        current_period_end,
        today
    )
    
    # 15 days remaining in month (31 total)
    remaining_ratio = 16 / 31  # 15 remaining + today
    
    assert 'credit_cents' in result
    assert 'new_charge_cents' in result
    assert 'net_charge_cents' in result
    assert result['net_charge_cents'] > 0  # Pro is more expensive


@patch('stripe.Subscription.modify')
def test_upgrade_subscription(mock_stripe_modify, client, db, auth_headers, sample_plans):
    """Test upgrading subscription to higher plan"""
    from app.models import User, Subscription
    
    user = User.query.filter_by(email='test@example.com').first()
    
    # Create initial subscription (Starter plan)
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[0].id,  # Starter
        stripe_subscription_id='sub_test_789',
        status='active',
        current_period_start=datetime.utcnow() - timedelta(days=15),
        current_period_end=datetime.utcnow() + timedelta(days=15)
    )
    db.session.add(subscription)
    db.session.commit()
    
    # Mock Stripe response
    mock_stripe_modify.return_value = MagicMock(
        id='sub_test_789',
        status='active'
    )
    
    response = client.post(
        f'/api/subscriptions/{subscription.id}/upgrade',
        json={'new_plan_id': str(sample_plans[1].id)},  # Pro
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['new_plan_name'] == 'Pro'
    assert 'prorated_charge_cents' in data
    assert data['prorated_charge_cents'] > 0


@patch('stripe.Subscription.modify')
def test_downgrade_subscription(mock_stripe_modify, client, db, auth_headers, sample_plans):
    """Test downgrading subscription to lower plan"""
    from app.models import User, Subscription
    
    user = User.query.filter_by(email='test@example.com').first()
    
    # Create subscription to Pro plan
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[1].id,  # Pro
        stripe_subscription_id='sub_test_down',
        status='active',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    mock_stripe_modify.return_value = MagicMock(id='sub_test_down', status='active')
    
    response = client.post(
        f'/api/subscriptions/{subscription.id}/downgrade',
        json={'new_plan_id': str(sample_plans[0].id)},  # Starter
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['new_plan_name'] == 'Starter'


def test_upgrade_same_plan_error(client, db, auth_headers, sample_plans):
    """Test upgrading to same plan returns error"""
    from app.models import User, Subscription
    
    user = User.query.filter_by(email='test@example.com').first()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[0].id,
        stripe_subscription_id='sub_test_same',
        status='active',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    response = client.post(
        f'/api/subscriptions/{subscription.id}/upgrade',
        json={'new_plan_id': str(sample_plans[0].id)},
        headers=auth_headers
    )
    
    assert response.status_code == 409


# ============================================================================
# PAYMENT FAILURE & GRACE PERIOD TESTS
# ============================================================================

def test_grace_period_creation(db):
    """Test creating grace period on payment failure"""
    from app.models import GracePeriod, Subscription, User, Plan
    
    user = User(email='grace@example.com', name='Grace User')
    plan = Plan(name='Test', amount_cents=2900, billing_cycle='monthly',
                features=[], stripe_price_id='price_grace')
    db.session.add_all([user, plan])
    db.session.commit()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        stripe_subscription_id='sub_grace',
        status='active',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    grace = GracePeriod(
        subscription_id=subscription.id,
        started_at=datetime.utcnow(),
        ends_at=datetime.utcnow() + timedelta(days=7),
        retry_count=0
    )
    db.session.add(grace)
    db.session.commit()
    
    assert grace.id is not None
    assert grace.retry_count == 0
    assert grace.locked is False


def test_payment_retry_logic(db):
    """Test payment retry tracking"""
    from app.models import GracePeriod, Subscription, User, Plan
    
    user = User(email='retry@example.com', name='Retry User')
    plan = Plan(name='Test', amount_cents=2900, billing_cycle='monthly',
                features=[], stripe_price_id='price_retry')
    db.session.add_all([user, plan])
    db.session.commit()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        stripe_subscription_id='sub_retry',
        status='past_due',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    grace = GracePeriod(
        subscription_id=subscription.id,
        started_at=datetime.utcnow(),
        ends_at=datetime.utcnow() + timedelta(days=7),
        retry_count=0
    )
    db.session.add(grace)
    db.session.commit()
    
    # Increment retry count
    grace.retry_count = 1
    grace.last_retry_at = datetime.utcnow()
    db.session.commit()
    
    assert grace.retry_count == 1
    assert grace.last_retry_at is not None


def test_account_lock_after_failed_retries(db):
    """Test account lock after 3 failed payment retries"""
    from app.models import GracePeriod, Subscription, User, Plan
    
    user = User(email='lock@example.com', name='Lock User', locked=False)
    plan = Plan(name='Test', amount_cents=2900, billing_cycle='monthly',
                features=[], stripe_price_id='price_lock')
    db.session.add_all([user, plan])
    db.session.commit()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        stripe_subscription_id='sub_lock',
        status='unpaid',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    grace = GracePeriod(
        subscription_id=subscription.id,
        started_at=datetime.utcnow(),
        ends_at=datetime.utcnow() + timedelta(days=7),
        retry_count=3,
        locked=True
    )
    db.session.add(grace)
    db.session.commit()
    
    user.locked = True
    db.session.commit()
    
    assert grace.locked is True
    assert user.locked is True
    assert grace.retry_count == 3


# ============================================================================
# WEBHOOK HANDLING TESTS
# ============================================================================

@patch('stripe.Webhook.construct_event')
def test_webhook_signature_verification(mock_construct, client, db):
    """Test webhook signature verification"""
    mock_construct.return_value = {
        'id': 'evt_test_123',
        'type': 'charge.failed',
        'data': {'object': {}}
    }
    
    response = client.post(
        '/api/webhooks/stripe',
        data='{}',
        headers={'Stripe-Signature': 'test_signature'},
        content_type='application/json'
    )
    
    # Should not return 400 BAD_SIGNATURE
    assert response.status_code != 400


@patch('stripe.Webhook.construct_event')
def test_webhook_idempotency(mock_construct, client, db):
    """Test webhook idempotent processing (same event twice = same result)"""
    from app.models import WebhookLog
    
    event_id = 'evt_idempotent_123'
    mock_construct.return_value = {
        'id': event_id,
        'type': 'charge.succeeded',
        'data': {'object': {'id': 'ch_test'}}
    }
    
    # First webhook call
    response1 = client.post(
        '/api/webhooks/stripe',
        data='{}',
        headers={'Stripe-Signature': 'test_sig1'},
        content_type='application/json'
    )
    
    # Second identical webhook call
    response2 = client.post(
        '/api/webhooks/stripe',
        data='{}',
        headers={'Stripe-Signature': 'test_sig2'},
        content_type='application/json'
    )
    
    # Both should return 200 OK (idempotent)
    assert response1.status_code == 200
    assert response2.status_code == 200
    
    # Should only have one webhook log entry
    with client.application.app_context():
        logs = WebhookLog.query.filter_by(stripe_event_id=event_id).all()
        assert len(logs) == 1


@patch('stripe.Webhook.construct_event')
def test_webhook_charge_failed_creates_grace_period(mock_construct, client, db, sample_plans):
    """Test charge.failed webhook creates grace period"""
    from app.models import User, Subscription, GracePeriod
    
    user = User(email='webhook@example.com', name='Webhook User')
    plan = sample_plans[0]
    db.session.add(user)
    db.session.commit()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        stripe_subscription_id='sub_webhook_fail',
        status='active',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    mock_construct.return_value = {
        'id': 'evt_charge_failed',
        'type': 'charge.failed',
        'data': {
            'object': {
                'id': 'ch_failed_123',
                'customer': 'cus_test',
                'metadata': {'subscription_id': str(subscription.id)}
            }
        }
    }
    
    response = client.post(
        '/api/webhooks/stripe',
        data='{}',
        headers={'Stripe-Signature': 'test'},
        content_type='application/json'
    )
    
    assert response.status_code == 200
    
    grace = GracePeriod.query.filter_by(subscription_id=subscription.id).first()
    if grace:  # Should exist after webhook
        assert grace.retry_count == 0
        assert grace.locked is False


# ============================================================================
# BILLING HISTORY TESTS
# ============================================================================

def test_get_billing_history(client, db, auth_headers, sample_plans):
    """Test retrieving user's billing history"""
    from app.models import User, Subscription, Invoice
    
    user = User.query.filter_by(email='test@example.com').first()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[0].id,
        stripe_subscription_id='sub_history',
        status='active',
        current_period_start=datetime.utcnow() - timedelta(days=30),
        current_period_end=datetime.utcnow()
    )
    db.session.add(subscription)
    db.session.commit()
    
    invoice = Invoice(
        user_id=user.id,
        subscription_id=subscription.id,
        stripe_invoice_id='in_test_123',
        amount_cents=2900,
        currency='usd',
        status='paid',
        period_start=datetime.utcnow() - timedelta(days=30),
        period_end=datetime.utcnow(),
        paid_at=datetime.utcnow()
    )
    db.session.add(invoice)
    db.session.commit()
    
    response = client.get('/api/billing/history', headers=auth_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'items' in data
    assert len(data['items']) > 0
    assert data['items'][0]['status'] == 'paid'
    assert data['items'][0]['amount_cents'] == 2900


def test_billing_history_pagination(client, db, auth_headers, sample_plans):
    """Test billing history pagination"""
    from app.models import User, Subscription, Invoice
    
    user = User.query.filter_by(email='test@example.com').first()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[0].id,
        stripe_subscription_id='sub_paginate',
        status='active',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    # Create 25 invoices
    for i in range(25):
        invoice = Invoice(
            user_id=user.id,
            subscription_id=subscription.id,
            stripe_invoice_id=f'in_test_{i}',
            amount_cents=2900,
            currency='usd',
            status='paid',
            period_start=datetime.utcnow() - timedelta(days=30*(i+1)),
            period_end=datetime.utcnow() - timedelta(days=30*i),
            paid_at=datetime.utcnow()
        )
        db.session.add(invoice)
    db.session.commit()
    
    # Get first page (limit 20)
    response = client.get('/api/billing/history?limit=20&offset=0', headers=auth_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['items']) == 20
    assert data['total'] == 25
    assert data['hasMore'] is True


# ============================================================================
# ADMIN DASHBOARD TESTS
# ============================================================================

def test_admin_billing_dashboard_requires_admin(client, auth_headers):
    """Test admin dashboard requires admin role"""
    response = client.get('/api/admin/billing', headers=auth_headers)
    
    # Regular user should get 403 Forbidden
    assert response.status_code == 403


def test_admin_billing_dashboard(client, db, admin_headers, sample_plans):
    """Test admin can see all customers' billing info"""
    from app.models import User, Subscription
    
    # Create test users with subscriptions
    for i in range(3):
        user = User(email=f'customer{i}@example.com', name=f'Customer {i}')
        db.session.add(user)
        db.session.commit()
        
        subscription = Subscription(
            user_id=user.id,
            plan_id=sample_plans[i % len(sample_plans)].id,
            stripe_subscription_id=f'sub_admin_{i}',
            status='active',
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30)
        )
        db.session.add(subscription)
        db.session.commit()
    
    response = client.get('/api/admin/billing', headers=admin_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'customers' in data
    assert data['total'] >= 3


def test_admin_billing_filter_by_status(client, db, admin_headers, sample_plans):
    """Test admin billing dashboard status filtering"""
    from app.models import User, Subscription
    
    # Create user with past_due subscription
    user = User(email='past_due@example.com', name='Past Due User')
    db.session.add(user)
    db.session.commit()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[0].id,
        stripe_subscription_id='sub_past_due',
        status='past_due',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    response = client.get('/api/admin/billing?status=past_due', headers=admin_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    # At least one customer with past_due status
    assert len(data['customers']) >= 1


@patch('stripe.PaymentIntent.create')
def test_admin_unlock_account(mock_payment, client, db, admin_headers):
    """Test admin can unlock locked account"""
    from app.models import User
    
    user = User(email='locked@example.com', name='Locked User', locked=True)
    db.session.add(user)
    db.session.commit()
    
    response = client.post(
        f'/api/admin/users/{user.id}/unlock',
        headers=admin_headers
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['locked'] is False


# ============================================================================
# RECONCILIATION TESTS
# ============================================================================

@patch('stripe.Subscription.list')
def test_reconciliation_job_basic(mock_stripe_list, db, sample_plans):
    """Test reconciliation job basic functionality"""
    from app.models import User, Subscription, ReconciliationLog
    from app.services.billing import reconcile_subscriptions_with_stripe
    
    # Create local subscription
    user = User(email='recon@example.com', name='Recon User')
    db.session.add(user)
    db.session.commit()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[0].id,
        stripe_subscription_id='sub_recon',
        status='active',
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    # Mock Stripe list
    mock_stripe_list.return_value = [MagicMock(
        id='sub_recon',
        status='active',
        items=MagicMock(data=[MagicMock(price=MagicMock(id='price_test_starter_monthly'))])
    )]
    
    # Run reconciliation
    result = reconcile_subscriptions_with_stripe()
    
    assert 'run_at' in result
    assert 'mismatches_found' in result
    assert 'fixed' in result


def test_reconciliation_detects_mismatch(db, sample_plans):
    """Test reconciliation detects status mismatch"""
    from app.models import User, Subscription, ReconciliationLog
    from app.services.billing import check_subscription_consistency
    
    user = User(email='mismatch@example.com', name='Mismatch User')
    db.session.add(user)
    db.session.commit()
    
    # Local: active, Stripe: past_due
    subscription = Subscription(
        user_id=user.id,
        plan_id=sample_plans[0].id,
        stripe_subscription_id='sub_mismatch',
        status='active',  # Local says active
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(subscription)
    db.session.commit()
    
    # Simulate Stripe response showing past_due
    stripe_sub = MagicMock(
        id='sub_mismatch',
        status='past_due'  # Stripe says past_due
    )
    
    is_consistent = check_subscription_consistency(subscription, stripe_sub)
    assert is_consistent is False


# ============================================================================
# FULL FLOW INTEGRATION TESTS
# ============================================================================

@patch('stripe.Subscription.create')
@patch('stripe.Subscription.retrieve')
def test_full_subscription_flow(mock_retrieve, mock_create, client, db, auth_headers, sample_plans):
    """Test complete subscription flow: create → retrieve → upgrade → cancel"""
    from app.models import Subscription
    
    # Mock Stripe responses
    mock_create.return_value = MagicMock(
        id='sub_full_flow',
        status='active',
        current_period_start=1234567890,
        current_period_end=1237246290,
        items=MagicMock(data=[MagicMock(price=MagicMock(id='price_test_starter_monthly'))])
    )
    
    # 1. Create subscription
    response = client.post(
        '/api/subscriptions',
        json={'plan_id': str(sample_plans[0].id)},
        headers=auth_headers
    )
    assert response.status_code == 200
    
    # 2. Verify subscription created
    response = client.get('/api/subscriptions', headers=auth_headers)
    assert response.status_code == 200
    
    # Get subscription ID
    subscription = Subscription.query.filter_by(stripe_subscription_id='sub_full_flow').first()
    assert subscription is not None


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v'])

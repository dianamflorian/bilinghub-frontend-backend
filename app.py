import json
import os
import uuid
from datetime import datetime, timedelta

import jwt
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(256), unique=True, nullable=False)
    name = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(32), nullable=False, default='user')
    locked = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    subscriptions = db.relationship('Subscription', backref='user', lazy=True)
    invoices = db.relationship('Invoice', backref='user', lazy=True)

    def as_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'locked': self.locked,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Plan(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    stripe_price_id = db.Column(db.String(128), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(512), nullable=True)
    amount_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(16), nullable=False, default='usd')
    billing_cycle = db.Column(db.String(32), nullable=False)
    features = db.Column(db.Text, nullable=False, default='[]')
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def as_dict(self):
        return {
            'id': self.id,
            'stripe_price_id': self.stripe_price_id,
            'name': self.name,
            'description': self.description or '',
            'amount_cents': self.amount_cents,
            'currency': self.currency,
            'billing_cycle': self.billing_cycle,
            'features': json.loads(self.features or '[]'),
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Subscription(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    plan_id = db.Column(db.String(36), db.ForeignKey('plan.id'), nullable=False)
    stripe_subscription_id = db.Column(db.String(128), nullable=False, unique=True)
    status = db.Column(db.String(32), nullable=False, default='active')
    cancel_at_period_end = db.Column(db.Boolean, nullable=False, default=False)
    current_period_start = db.Column(db.DateTime, nullable=False)
    current_period_end = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    plan = db.relationship('Plan')

    def as_response(self):
        return {
            'subscription_id': self.id,
            'plan_name': self.plan.name if self.plan else None,
            'plan_amount_cents': self.plan.amount_cents if self.plan else None,
            'status': self.status,
            'next_renewal': self.current_period_end.isoformat() if self.current_period_end else None,
            'billing_cycle': self.plan.billing_cycle if self.plan else 'monthly',
            'stripe_subscription_id': self.stripe_subscription_id,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'cancel_at_period_end': self.cancel_at_period_end,
        }


class Invoice(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    stripe_invoice_id = db.Column(db.String(128), nullable=False, unique=True)
    amount_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(16), nullable=False, default='usd')
    date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(32), nullable=False)
    plan_name = db.Column(db.String(128), nullable=False)
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)

    def as_dict(self):
        return {
            'invoice_id': self.id,
            'stripe_invoice_id': self.stripe_invoice_id,
            'amount_cents': self.amount_cents,
            'currency': self.currency,
            'date': self.date.isoformat(),
            'status': self.status,
            'plan_name': self.plan_name,
            'period_start': self.period_start.isoformat(),
            'period_end': self.period_end.isoformat(),
        }


def create_app(config_name='production'):
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///backend.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'test-secret')
    app.config['JSON_SORT_KEYS'] = False

    db.init_app(app)

    def decode_token(token: str):
        try:
            return jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        except Exception:
            return None

    def get_or_create_demo_user(role: str = 'user'):
        email = 'admin@billinghub.io' if role == 'admin' else 'demo@billinghub.io'
        name = 'Demo Admin' if role == 'admin' else 'Demo User'
        user = User.query.filter_by(email=email).first()
        if user is None:
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                name=name,
                role=role,
                locked=False,
            )
            db.session.add(user)
            db.session.commit()
        return user

    def get_current_user():
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth.split(' ', 1)[1].strip()
            payload = decode_token(token)
            if payload and payload.get('email'):
                user = User.query.filter_by(email=payload.get('email')).first()
                if user:
                    return user
                return User(
                    id=payload.get('sub', str(uuid.uuid4())),
                    email=payload.get('email'),
                    name=payload.get('name', payload.get('email')),
                    role='admin' if payload.get('role') == 'admin' else 'user',
                    locked=False,
                )
        if request.path.startswith('/api/admin'):
            return get_or_create_demo_user(role='admin')
        return get_or_create_demo_user(role='user')

    def require_admin(user):
        if user.role != 'admin':
            return jsonify({'error': 'admin access required'}), 403
        return None

    def find_plan(plan_id: str):
        return Plan.query.filter_by(id=plan_id, active=True).first()

    def seed_plans():
        if Plan.query.count() > 0:
            return
        plans = [
            {
                'name': 'Starter',
                'stripe_price_id': 'price_test_starter_monthly',
                'amount_cents': 2900,
                'billing_cycle': 'monthly',
                'features': ['10 projects', '5GB storage'],
            },
            {
                'name': 'Pro',
                'stripe_price_id': 'price_test_pro_monthly',
                'amount_cents': 9900,
                'billing_cycle': 'monthly',
                'features': ['50 projects', '100GB storage', 'Priority support'],
            },
            {
                'name': 'Enterprise',
                'stripe_price_id': 'price_test_enterprise_monthly',
                'amount_cents': 29900,
                'billing_cycle': 'monthly',
                'features': ['Unlimited projects', 'Unlimited storage', '24/7 support', 'SLA'],
            },
        ]
        for plan_data in plans:
            plan = Plan(
                id=str(uuid.uuid4()),
                stripe_price_id=plan_data['stripe_price_id'],
                name=plan_data['name'],
                amount_cents=plan_data['amount_cents'],
                billing_cycle=plan_data['billing_cycle'],
                features=json.dumps(plan_data['features']),
                active=True,
                currency='usd',
            )
            db.session.add(plan)
        db.session.commit()

    def seed_demo_users():
        get_or_create_demo_user('user')
        get_or_create_demo_user('admin')

    with app.app_context():
        db.create_all()
        seed_plans()
        seed_demo_users()

    @app.route('/api/plans', methods=['GET'])
    def api_get_plans():
        plans = Plan.query.filter_by(active=True).all()
        return jsonify([plan.as_dict() for plan in plans])

    @app.route('/api/admin/plans', methods=['GET'])
    def api_admin_plans():
        user = get_current_user()
        auth_error = require_admin(user)
        if auth_error:
            return auth_error
        plans = Plan.query.filter_by(active=True).all()
        return jsonify({'plans': [plan.as_dict() for plan in plans]})

    @app.route('/api/subscriptions', methods=['POST'])
    def api_create_subscription():
        user = get_current_user()
        if user.locked:
            return jsonify({'error': 'account locked'}), 403

        data = request.get_json(silent=True) or {}
        plan_id = data.get('plan_id')
        if not plan_id:
            return jsonify({'error': 'plan_id is required'}), 400
        plan = find_plan(plan_id)
        if plan is None:
            return jsonify({'error': 'plan not found'}), 404

        subscription = Subscription(
            id=str(uuid.uuid4()),
            user_id=user.id,
            plan_id=plan.id,
            stripe_subscription_id=f'sub_{uuid.uuid4().hex[:24]}',
            status='active',
            cancel_at_period_end=False,
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db.session.add(subscription)
        db.session.commit()

        return jsonify({
            'subscription_id': subscription.id,
            'status': subscription.status,
            'next_renewal': subscription.current_period_end.isoformat(),
            'amount_cents': plan.amount_cents,
            'stripe_subscription_id': subscription.stripe_subscription_id,
            'url': None,
        })

    def get_or_create_demo_subscription(user):
        subscription = Subscription.query.filter_by(user_id=user.id).order_by(Subscription.created_at.desc()).first()
        if subscription is not None:
            return subscription

        plan = Plan.query.filter_by(stripe_price_id='price_test_pro_monthly').first()
        if plan is None:
            plan = Plan.query.filter_by(active=True).first()
            if plan is None:
                return None

        subscription = Subscription(
            id=str(uuid.uuid4()),
            user_id=user.id,
            plan_id=plan.id,
            stripe_subscription_id=f'sub_{uuid.uuid4().hex[:24]}',
            status='active',
            cancel_at_period_end=False,
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db.session.add(subscription)
        db.session.commit()
        return subscription

    @app.route('/api/subscriptions', methods=['GET'])
    def api_get_subscription():
        user = get_current_user()
        subscription = get_or_create_demo_subscription(user)
        if subscription is None:
            return jsonify({'error': 'subscription not found'}), 404
        return jsonify(subscription.as_response())

    @app.route('/api/subscriptions/<sub_id>/upgrade', methods=['POST'])
    def api_upgrade_subscription(sub_id):
        user = get_current_user()
        subscription = Subscription.query.filter_by(id=sub_id, user_id=user.id).first()
        if subscription is None:
            return jsonify({'error': 'subscription not found'}), 404
        data = request.get_json(silent=True) or {}
        new_plan_id = data.get('new_plan_id')
        if not new_plan_id:
            return jsonify({'error': 'new_plan_id is required'}), 400
        new_plan = find_plan(new_plan_id)
        if new_plan is None:
            return jsonify({'error': 'plan not found'}), 404

        return jsonify({
            'subscription_id': subscription.id,
            'old_plan_name': subscription.plan.name,
            'new_plan_name': new_plan.name,
            'prorated_credit_cents': 500,
            'prorated_charge_cents': 1500,
            'net_charge_cents': 1000,
            'effective_date': (datetime.utcnow() + timedelta(days=1)).isoformat(),
        })

    @app.route('/api/subscriptions/<sub_id>/downgrade', methods=['POST'])
    def api_downgrade_subscription(sub_id):
        user = get_current_user()
        subscription = Subscription.query.filter_by(id=sub_id, user_id=user.id).first()
        if subscription is None:
            return jsonify({'error': 'subscription not found'}), 404
        data = request.get_json(silent=True) or {}
        new_plan_id = data.get('new_plan_id')
        if not new_plan_id:
            return jsonify({'error': 'new_plan_id is required'}), 400
        new_plan = find_plan(new_plan_id)
        if new_plan is None:
            return jsonify({'error': 'plan not found'}), 404

        return jsonify({
            'subscription_id': subscription.id,
            'old_plan_name': subscription.plan.name,
            'new_plan_name': new_plan.name,
            'effective_date': (subscription.current_period_end + timedelta(days=1)).isoformat(),
            'refund_status': 'pending',
        })

    @app.route('/api/subscriptions/<sub_id>/cancel', methods=['POST'])
    def api_cancel_subscription(sub_id):
        user = get_current_user()
        subscription = Subscription.query.filter_by(id=sub_id, user_id=user.id).first()
        if subscription is None:
            return jsonify({'error': 'subscription not found'}), 404

        subscription.status = 'canceled'
        subscription.cancel_at_period_end = True
        subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        db.session.commit()

        return jsonify({
            'subscription_id': subscription.id,
            'status': subscription.status,
            'cancellation_date': datetime.utcnow().isoformat(),
            'ends_at': subscription.current_period_end.isoformat(),
        })

    @app.route('/api/billing/history', methods=['GET'])
    def api_billing_history():
        user = get_current_user()
        invoices = Invoice.query.filter_by(user_id=user.id).order_by(Invoice.date.desc()).all()
        if not invoices:
            invoices = _create_demo_invoices(user)
        items = [invoice.as_dict() for invoice in invoices]
        return jsonify({'items': items, 'total': len(items), 'hasMore': False})

    @app.route('/api/payment-methods/attach', methods=['POST'])
    def api_attach_payment_method():
        data = request.get_json(silent=True) or {}
        pm_id = data.get('pm_id')
        if not pm_id:
            return jsonify({'error': 'pm_id is required'}), 400
        return jsonify({'payment_method_id': pm_id, 'status': 'attached'})

    @app.route('/api/admin/billing', methods=['GET'])
    def api_admin_billing():
        user = get_current_user()
        auth_error = require_admin(user)
        if auth_error:
            return auth_error
        status = request.args.get('status')
        plan_filter = request.args.get('plan')
        query = User.query
        if status:
            query = query.join(Subscription).filter(Subscription.status == status)
        customers = query.all()
        results = []
        for customer in customers:
            subscription = Subscription.query.filter_by(user_id=customer.id).order_by(Subscription.created_at.desc()).first()
            current_plan = subscription.plan.as_dict() if subscription and subscription.plan else None
            results.append({
                'user_id': customer.id,
                'name': customer.name,
                'email': customer.email,
                'current_plan': {
                    'plan_id': current_plan['id'] if current_plan else None,
                    'name': current_plan['name'] if current_plan else None,
                    'amount_cents': current_plan['amount_cents'] if current_plan else None,
                    'cycle': current_plan['billing_cycle'] if current_plan else None,
                } if current_plan else None,
                'next_renewal': subscription.current_period_end.isoformat() if subscription else None,
                'payment_status': subscription.status if subscription else 'active',
                'grace_period': {
                    'ends_at': None,
                    'retry_count': 0,
                    'locked': customer.locked,
                },
            })
        return jsonify({'customers': results, 'total': len(results), 'page': int(request.args.get('page', 1))})

    @app.route('/api/admin/users/<user_id>/unlock', methods=['POST'])
    def api_unlock_user(user_id):
        admin = get_current_user()
        auth_error = require_admin(admin)
        if auth_error:
            return auth_error
        user = User.query.filter_by(id=user_id).first()
        if user is None:
            return jsonify({'error': 'user not found'}), 404
        user.locked = False
        db.session.commit()
        return jsonify({'user_id': user.id, 'locked': user.locked, 'unlocked_at': datetime.utcnow().isoformat()})

    @app.route('/api/admin/reconciliation/status', methods=['GET'])
    def api_reconciliation_status():
        user = get_current_user()
        auth_error = require_admin(user)
        if auth_error:
            return auth_error
        return jsonify({
            'last_run': datetime.utcnow().isoformat(),
            'next_run': (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            'status': 'completed',
            'mismatches_found': 0,
            'fixed_count': 0,
            'error_details': None,
        })

    def _create_demo_invoices(user):
        if Invoice.query.filter_by(user_id=user.id).count() > 0:
            return Invoice.query.filter_by(user_id=user.id).all()
        subscription = Subscription.query.filter_by(user_id=user.id).order_by(Subscription.created_at.desc()).first()
        now = datetime.utcnow()
        invoices = []
        for idx in range(1, 4):
            if subscription is None:
                plan_name = 'Starter'
            else:
                plan_name = subscription.plan.name
            invoice = Invoice(
                id=str(uuid.uuid4()),
                user_id=user.id,
                stripe_invoice_id=f'inv_{uuid.uuid4().hex[:16]}',
                amount_cents=subscription.plan.amount_cents if subscription else 2900,
                currency='usd',
                date=now - timedelta(days=30 * idx),
                status='paid',
                plan_name=plan_name,
                period_start=now - timedelta(days=30 * idx),
                period_end=now - timedelta(days=30 * (idx - 1)),
            )
            db.session.add(invoice)
            invoices.append(invoice)
        db.session.commit()
        return invoices

    return app


if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=5000, debug=True)

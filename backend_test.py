import requests
import sys
import json
from datetime import datetime

class AssesslyAPITester:
    def __init__(self, base_url="https://smartassess-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON response)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Error: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "name": "Test User",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@assesslytest.com",
            "organization": "Test Organization",
            "password": "testpassword123",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
            return True, test_user_data
        return False, {}

    def test_user_login(self, user_data):
        """Test user login"""
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
            return True
        return False

    def test_get_current_user(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_contact_form_submission(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test Contact",
            "email": "contact@test.com",
            "company": "Test Company",
            "message": "This is a test message from automated testing."
        }
        
        success, response = self.run_test(
            "Contact Form Submission",
            "POST",
            "contact",
            200,
            data=contact_data
        )
        return success

    def test_demo_request_submission(self):
        """Test demo request submission"""
        demo_data = {
            "name": "Test Demo User",
            "email": "demo@test.com",
            "company": "Test Demo Company",
            "size": "50-200 employees",
            "notes": "Automated test demo request"
        }
        
        success, response = self.run_test(
            "Demo Request Submission",
            "POST",
            "demo",
            200,
            data=demo_data
        )
        return success

    def test_get_current_subscription(self):
        """Test get current subscription"""
        success, response = self.run_test(
            "Get Current Subscription",
            "GET",
            "subscriptions/current",
            200
        )
        return success

    def test_get_current_organization(self):
        """Test get current organization"""
        success, response = self.run_test(
            "Get Current Organization",
            "GET",
            "organizations/current",
            200
        )
        return success

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access Test",
            "GET",
            "auth/me",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_data = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        
        success, response = self.run_test(
            "Invalid Login Test",
            "POST",
            "auth/login",
            401,
            data=invalid_data
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Assessly Platform API Tests")
        print("=" * 50)
        
        # Test API health
        if not self.test_health_check():
            print("❌ API is not responding. Stopping tests.")
            return False
        
        # Test user registration and login flow
        reg_success, user_data = self.test_user_registration()
        if not reg_success:
            print("❌ User registration failed. Stopping tests.")
            return False
        
        # Test login with the registered user
        if not self.test_user_login(user_data):
            print("❌ User login failed. Stopping tests.")
            return False
        
        # Test protected endpoints (require authentication)
        self.test_get_current_user()
        self.test_get_current_subscription()
        self.test_get_current_organization()
        
        # Test public endpoints
        self.test_contact_form_submission()
        self.test_demo_request_submission()
        
        # Test security
        self.test_unauthorized_access()
        self.test_invalid_login()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test function"""
    tester = AssesslyAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
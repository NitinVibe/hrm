import sys
sys.path.insert(0, ".")

import uuid
from datetime import date, datetime, time, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.organization import Organization
from app.models.user import User
from app.models.role import Role
from app.models.branch import Branch
from app.models.department import Department
from app.models.designation import Designation
from app.models.shift import Shift
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.attendance_regularization import AttendanceRegularization
from app.models.holiday import Holiday
from app.models.leave_type import LeaveType
from app.models.leave_balance import LeaveBalance
from app.models.leave import Leave
from app.models.payroll import SalaryStructure, EmployeeSalary, PayrollRun, Payslip
from app.models.performance import PerformanceCycle, Goal, PerformanceReview
from app.models.recruitment import JobOpening, Candidate, Interview
from app.models.document import Document
from app.models.announcement import Announcement, Notification
from app.models.audit_log import AuditLog
from app.services.audit import log_audit


def seed_enterprise_data():
    db: Session = SessionLocal()
    try:
        print("--- Starting Enterprise HRM Data Seeding ---")

        # 1. Fetch organization of primary admin
        admin_user = db.scalar(select(User).where(User.email == "nitin@gmail.com"))
        if not admin_user:
            admin_user = db.scalar(select(User))
        
        if not admin_user:
            print("Error: No user/organization found in database. Please run initial setup.")
            return

        org_id = admin_user.organization_id
        org = db.scalar(select(Organization).where(Organization.id == org_id))
        print(f"Target Organization: {org.name} ({org_id})")

        # Roles
        roles = {r.name: r for r in db.scalars(select(Role)).all()}

        # 2. Branches
        branches_data = [
            {"name": "Bangalore Tech Hub", "code": "BLR-HQ", "city": "Bangalore", "state": "Karnataka", "address": "Electronic City Phase 1"},
            {"name": "Gurugram NCR Office", "code": "GGN-01", "city": "Gurugram", "state": "Haryana", "address": "Cyber Hub, DLF Phase 2"},
            {"name": "Mumbai Financial Hub", "code": "BOM-01", "city": "Mumbai", "state": "Maharashtra", "address": "BKC, Bandra East"},
        ]
        branch_objs = []
        for b_info in branches_data:
            existing_b = db.scalar(select(Branch).where(Branch.organization_id == org_id, Branch.code == b_info["code"]))
            if not existing_b:
                existing_b = Branch(organization_id=org_id, **b_info)
                db.add(existing_b)
                db.flush()
            branch_objs.append(existing_b)
        print(f"Verified {len(branch_objs)} branches.")

        # 3. Departments
        depts_data = [
            {"name": "Engineering", "description": "Core software product and infrastructure development"},
            {"name": "Product & Design", "description": "UI/UX research, product strategy, and roadmaps"},
            {"name": "Human Resources", "description": "Talent acquisition, employee engagement, and payroll"},
            {"name": "Finance & Legal", "description": "Financial accounting, compliance, and auditing"},
            {"name": "Sales & Marketing", "description": "Enterprise customer acquisition and brand growth"},
        ]
        dept_objs = {}
        for d_info in depts_data:
            d = db.scalar(select(Department).where(Department.organization_id == org_id, Department.name == d_info["name"]))
            if not d:
                d = Department(organization_id=org_id, **d_info)
                db.add(d)
                db.flush()
            dept_objs[d.name] = d
        print(f"Verified {len(dept_objs)} departments.")

        # 4. Designations
        desigs_data = [
            {"name": "Engineering Director", "description": "Technical leadership and architectural governance"},
            {"name": "Senior Full Stack Engineer", "description": "FastAPI and React SaaS architecture"},
            {"name": "Frontend Developer", "description": "Web client features and UI implementation"},
            {"name": "DevOps Architect", "description": "Cloud infrastructure, CI/CD, and reliability"},
            {"name": "Product Manager", "description": "Feature scoping and user story management"},
            {"name": "HR Business Partner", "description": "People operations and talent management"},
            {"name": "Financial Analyst", "description": "Treasury, bookkeeping, and payroll accounting"},
        ]
        desig_objs = {}
        for ds_info in desigs_data:
            ds = db.scalar(select(Designation).where(Designation.organization_id == org_id, Designation.name == ds_info["name"]))
            if not ds:
                ds = Designation(organization_id=org_id, **ds_info)
                db.add(ds)
                db.flush()
            desig_objs[ds.name] = ds
        print(f"Verified {len(desig_objs)} designations.")

        # 5. Shifts
        shifts_data = [
            {"name": "Standard Morning Shift", "start_time": time(9, 0), "end_time": time(18, 0), "grace_minutes": 15},
            {"name": "Early Shift", "start_time": time(8, 0), "end_time": time(17, 0), "grace_minutes": 15},
            {"name": "Flexible General Shift", "start_time": time(10, 0), "end_time": time(19, 0), "grace_minutes": 30},
        ]
        shift_objs = []
        for s_info in shifts_data:
            s = db.scalar(select(Shift).where(Shift.organization_id == org_id, Shift.name == s_info["name"]))
            if not s:
                s = Shift(organization_id=org_id, **s_info)
                db.add(s)
                db.flush()
            shift_objs.append(s)
        print(f"Verified {len(shift_objs)} shifts.")

        # 6. Leave Types
        leave_types_data = [
            {"name": "Casual Leave", "code": "CL", "days_allowed_per_year": 12.0, "carry_forward_days": 2.0, "is_paid": True},
            {"name": "Sick Leave", "code": "SL", "days_allowed_per_year": 10.0, "carry_forward_days": 5.0, "is_paid": True},
            {"name": "Earned Leave", "code": "EL", "days_allowed_per_year": 15.0, "carry_forward_days": 10.0, "is_paid": True},
            {"name": "Paternity / Maternity Leave", "code": "PL", "days_allowed_per_year": 30.0, "carry_forward_days": 0.0, "is_paid": True},
        ]
        leave_type_objs = {}
        for lt_info in leave_types_data:
            lt = db.scalar(select(LeaveType).where(LeaveType.organization_id == org_id, LeaveType.code == lt_info["code"]))
            if not lt:
                lt = LeaveType(organization_id=org_id, **lt_info)
                db.add(lt)
                db.flush()
            leave_type_objs[lt.code] = lt
        print(f"Verified {len(leave_type_objs)} leave types.")

        # 7. Holidays
        curr_year = date.today().year
        holidays_data = [
            {"name": "Republic Day", "holiday_date": date(curr_year, 1, 26), "description": "National Celebration"},
            {"name": "Holi Festival", "holiday_date": date(curr_year, 3, 25), "description": "Festival of Colors"},
            {"name": "Labor Day", "holiday_date": date(curr_year, 5, 1), "description": "International Workers' Day"},
            {"name": "Independence Day", "holiday_date": date(curr_year, 8, 15), "description": "National Holiday"},
            {"name": "Gandhi Jayanti", "holiday_date": date(curr_year, 10, 2), "description": "National Holiday"},
            {"name": "Diwali Festival", "holiday_date": date(curr_year, 11, 1), "description": "Festival of Lights"},
            {"name": "Christmas", "holiday_date": date(curr_year, 12, 25), "description": "Christmas Celebration"},
        ]
        for h_info in holidays_data:
            h = db.scalar(select(Holiday).where(Holiday.organization_id == org_id, Holiday.holiday_date == h_info["holiday_date"]))
            if not h:
                h = Holiday(organization_id=org_id, **h_info)
                db.add(h)
        print("Verified calendar holidays.")

        # 8. Employees Seed
        employees_seed = [
            {
                "first_name": "Arjun", "last_name": "Mehta", "email": "arjun.mehta@enterprisehrm.com",
                "phone": "+91 98765 43210", "dept": "Engineering", "desig": "Engineering Director",
                "gender": "Male", "marital_status": "Married", "blood_group": "O+",
                "employment_type": "full_time", "bank": "HDFC Bank", "acc": "50100492817261",
                "pan": "ABCDE1234F", "aadhar": "4512 8794 1209", "is_manager": True
            },
            {
                "first_name": "Priya", "last_name": "Sharma", "email": "priya.sharma@enterprisehrm.com",
                "phone": "+91 98111 22334", "dept": "Human Resources", "desig": "HR Business Partner",
                "gender": "Female", "marital_status": "Single", "blood_group": "B+",
                "employment_type": "full_time", "bank": "ICICI Bank", "acc": "002401569872",
                "pan": "BPZPS9821K", "aadhar": "9081 2341 5678", "is_manager": True
            },
            {
                "first_name": "Vikram", "last_name": "Aditya", "email": "vikram.aditya@enterprisehrm.com",
                "phone": "+91 97234 56789", "dept": "Engineering", "desig": "Senior Full Stack Engineer",
                "gender": "Male", "marital_status": "Single", "blood_group": "A+",
                "employment_type": "full_time", "bank": "State Bank of India", "acc": "20481928371",
                "pan": "CRQPA4512M", "aadhar": "7812 6543 8901", "is_manager": False
            },
            {
                "first_name": "Ananya", "last_name": "Iyer", "email": "ananya.iyer@enterprisehrm.com",
                "phone": "+91 99887 76655", "dept": "Product & Design", "desig": "Product Manager",
                "gender": "Female", "marital_status": "Married", "blood_group": "AB+",
                "employment_type": "full_time", "bank": "Axis Bank", "acc": "918010023456789",
                "pan": "AIYPA8765L", "aadhar": "3421 9876 1234", "is_manager": True
            },
            {
                "first_name": "Rohan", "last_name": "Verma", "email": "rohan.verma@enterprisehrm.com",
                "phone": "+91 96543 21098", "dept": "Engineering", "desig": "Frontend Developer",
                "gender": "Male", "marital_status": "Single", "blood_group": "B-",
                "employment_type": "full_time", "bank": "Kotak Mahindra Bank", "acc": "78123984",
                "pan": "RVMPA3421Q", "aadhar": "8901 2345 6789", "is_manager": False
            },
            {
                "first_name": "Deepika", "last_name": "Nair", "email": "deepika.nair@enterprisehrm.com",
                "phone": "+91 95432 10987", "dept": "Finance & Legal", "desig": "Financial Analyst",
                "gender": "Female", "marital_status": "Married", "blood_group": "O-",
                "employment_type": "full_time", "bank": "HDFC Bank", "acc": "50100876123490",
                "pan": "DNIPA9012R", "aadhar": "6789 0123 4567", "is_manager": False
            },
            {
                "first_name": "Karthik", "last_name": "Reddy", "email": "karthik.reddy@enterprisehrm.com",
                "phone": "+91 94321 09876", "dept": "Engineering", "desig": "DevOps Architect",
                "gender": "Male", "marital_status": "Single", "blood_group": "A-",
                "employment_type": "full_time", "bank": "ICICI Bank", "acc": "002409871234",
                "pan": "KRDPA6789S", "aadhar": "1234 5678 9012", "is_manager": False
            }
        ]

        active_employees = []
        arjun_manager = None
        for idx, emp_info in enumerate(employees_seed):
            existing_emp = db.scalar(select(Employee).where(Employee.organization_id == org_id, Employee.email == emp_info["email"]))
            if not existing_emp:
                code = f"EMP-{1000 + idx}"
                existing_emp = Employee(
                    organization_id=org_id,
                    employee_code=code,
                    first_name=emp_info["first_name"],
                    last_name=emp_info["last_name"],
                    email=emp_info["email"],
                    phone=emp_info["phone"],
                    department_id=dept_objs[emp_info["dept"]].id,
                    designation_id=desig_objs[emp_info["desig"]].id,
                    shift_id=shift_objs[idx % len(shift_objs)].id,
                    branch_id=branch_objs[idx % len(branch_objs)].id,
                    gender=emp_info["gender"],
                    marital_status=emp_info["marital_status"],
                    blood_group=emp_info["blood_group"],
                    employment_status="active",
                    employment_type=emp_info["employment_type"],
                    joining_date=date.today() - timedelta(days=200 + (idx * 30)),
                    emergency_contact_name=f"{emp_info['last_name']} Family",
                    emergency_contact_phone="+91 91234 56789",
                    emergency_contact_relation="Spouse/Parent",
                    bank_name=emp_info["bank"],
                    account_number=emp_info["acc"],
                    ifsc_code="HDFC0001234",
                    pan_number=emp_info["pan"],
                    aadhar_number=emp_info["aadhar"],
                )
                db.add(existing_emp)
                db.flush()
            if emp_info["first_name"] == "Arjun":
                arjun_manager = existing_emp
            elif arjun_manager and not existing_emp.reporting_manager_id:
                existing_emp.reporting_manager_id = arjun_manager.id

            active_employees.append(existing_emp)
        print(f"Verified {len(active_employees)} core enterprise employees with full profiles.")

        # 9. Leave Balances for all employees
        for emp in active_employees:
            for code, lt in leave_type_objs.items():
                bal = db.scalar(select(LeaveBalance).where(LeaveBalance.employee_id == emp.id, LeaveBalance.leave_type_id == lt.id, LeaveBalance.year == curr_year))
                if not bal:
                    used = 1.0 if code == "CL" else (0.5 if code == "SL" else 0.0)
                    bal = LeaveBalance(
                        organization_id=org_id,
                        employee_id=emp.id,
                        leave_type_id=lt.id,
                        year=curr_year,
                        total_allocated=lt.days_allowed_per_year,
                        used_days=used,
                        pending_days=0.0,
                    )
                    db.add(bal)
        print("Initialized annual leave balance allocations.")

        # 10. Attendance Records (Last 14 days)
        today = date.today()
        for i in range(14):
            day = today - timedelta(days=13 - i)
            # Skip Sundays
            if day.weekday() == 6:
                continue
            
            for e_idx, emp in enumerate(active_employees):
                existing_att = db.scalar(select(Attendance).where(Attendance.employee_id == emp.id, Attendance.attendance_date == day))
                if not existing_att:
                    # Randomize realistic checkin
                    is_late = (e_idx + i) % 5 == 0
                    check_in_h = 9 if not is_late else 9
                    check_in_m = 5 if not is_late else 35
                    late_min = 20 if is_late else 0
                    
                    ci = datetime.combine(day, time(check_in_h, check_in_m))
                    co = datetime.combine(day, time(18, 10))
                    working_min = int((co - ci).total_seconds() // 60)

                    att = Attendance(
                        organization_id=org_id,
                        employee_id=emp.id,
                        attendance_date=day,
                        check_in=ci,
                        check_out=co,
                        status="late" if is_late else "present",
                        late_minutes=late_min,
                        working_minutes=working_min,
                    )
                    db.add(att)
        print("Generated 14-day comprehensive attendance logs.")

        # 11. Salary Structures & Employee Salaries
        struct_data = [
            {"name": "Engineering Staff Grade 1", "base_annual_ctc": 960000.0, "description": "Junior to Mid Engineers"},
            {"name": "Engineering Staff Grade 2", "base_annual_ctc": 1800000.0, "description": "Senior Technical Specialists"},
            {"name": "Executive & Director Grade", "base_annual_ctc": 3200000.0, "description": "Leadership & Strategy"},
        ]
        for st_info in struct_data:
            st = db.scalar(select(SalaryStructure).where(SalaryStructure.organization_id == org_id, SalaryStructure.name == st_info["name"]))
            if not st:
                st = SalaryStructure(organization_id=org_id, **st_info)
                db.add(st)
        
        for idx, emp in enumerate(active_employees):
            sal = db.scalar(select(EmployeeSalary).where(EmployeeSalary.employee_id == emp.id))
            if not sal:
                base_monthly = 50000.0 + (idx * 15000.0)
                basic = round(base_monthly * 0.5, 2)
                hra = round(base_monthly * 0.3, 2)
                allowance = round(base_monthly * 0.2, 2)
                pf = round(basic * 0.12, 2)
                tax = round(base_monthly * 0.08, 2)
                gross = basic + hra + allowance
                net = gross - pf - tax

                sal = EmployeeSalary(
                    organization_id=org_id,
                    employee_id=emp.id,
                    effective_date=date(curr_year, 1, 1),
                    basic_salary=basic,
                    hra=hra,
                    conveyance_allowance=round(allowance * 0.4, 2),
                    special_allowance=round(allowance * 0.6, 2),
                    pf_deduction=pf,
                    esi_deduction=0.0,
                    tds_tax_deduction=tax,
                    gross_salary=gross,
                    net_salary=net,
                    is_active=True,
                )
                db.add(sal)
        print("Configured salary structures and employee CTC assignments.")

        # 12. Payroll Run & Payslips for Previous Month
        last_month = 8 if date.today().month == 9 else (date.today().month - 1 or 12)
        pr_year = curr_year if last_month != 12 else curr_year - 1
        run = db.scalar(select(PayrollRun).where(PayrollRun.organization_id == org_id, PayrollRun.month == last_month, PayrollRun.year == pr_year))
        if not run:
            run = PayrollRun(
                organization_id=org_id,
                month=last_month,
                year=pr_year,
                total_gross=0.0,
                total_net=0.0,
                total_deductions=0.0,
                status="paid",
                notes=f"Monthly payroll for {last_month}/{pr_year}",
                processed_by_id=admin_user.id,
                processed_at=datetime.utcnow() - timedelta(days=25),
            )
            db.add(run)
            db.flush()

            t_gross = 0.0
            t_net = 0.0
            t_ded = 0.0
            for emp in active_employees:
                sal = db.scalar(select(EmployeeSalary).where(EmployeeSalary.employee_id == emp.id))
                basic = sal.basic_salary if sal else 40000.0
                hra = sal.hra if sal else 20000.0
                allowances = (sal.conveyance_allowance + sal.special_allowance) if sal else 10000.0
                gross = basic + hra + allowances
                pf = sal.pf_deduction if sal else 4800.0
                tax = sal.tds_tax_deduction if sal else 3500.0
                deductions = pf + tax
                net = gross - deductions

                ps = Payslip(
                    organization_id=org_id,
                    payroll_run_id=run.id,
                    employee_id=emp.id,
                    month=last_month,
                    year=pr_year,
                    working_days=30,
                    present_days=28,
                    leave_days=2,
                    basic_salary=basic,
                    hra=hra,
                    allowances=allowances,
                    gross_salary=gross,
                    pf_deduction=pf,
                    tax_deduction=tax,
                    other_deductions=0.0,
                    net_salary=net,
                    status="paid",
                    paid_at=datetime.utcnow() - timedelta(days=24),
                )
                db.add(ps)
                t_gross += gross
                t_net += net
                t_ded += deductions

            run.total_gross = round(t_gross, 2)
            run.total_net = round(t_net, 2)
            run.total_deductions = round(t_ded, 2)
        print("Generated processed payroll run with disbursed employee payslips.")

        # 13. Performance Cycle & Goals
        cycle = db.scalar(select(PerformanceCycle).where(PerformanceCycle.organization_id == org_id, PerformanceCycle.title == "FY26 Q3 OKR Performance Cycle"))
        if not cycle:
            cycle = PerformanceCycle(
                organization_id=org_id,
                title="FY26 Q3 OKR Performance Cycle",
                start_date=date(curr_year, 7, 1),
                end_date=date(curr_year, 9, 30),
                status="active",
            )
            db.add(cycle)
            db.flush()

        goals_seed = [
            {"title": "Deliver Enterprise Multi-Tenancy Architecture", "metric_kpi": "Code Coverage", "target_value": "95%", "current_value": "92%", "pct": 92, "weight": 40},
            {"title": "Optimize Backend Database Response Times", "metric_kpi": "p99 Latency", "target_value": "< 50ms", "current_value": "42ms", "pct": 100, "weight": 30},
            {"title": "Implement Modular React Component Library", "metric_kpi": "Design Components", "target_value": "25 Components", "current_value": "22 Components", "pct": 88, "weight": 30},
        ]
        for g_data in goals_seed:
            g = db.scalar(select(Goal).where(Goal.organization_id == org_id, Goal.title == g_data["title"]))
            if not g and active_employees:
                g = Goal(
                    organization_id=org_id,
                    employee_id=active_employees[2].id,  # Vikram
                    cycle_id=cycle.id,
                    title=g_data["title"],
                    metric_kpi=g_data["metric_kpi"],
                    target_value=g_data["target_value"],
                    current_value=g_data["current_value"],
                    progress_percentage=g_data["pct"],
                    weightage=g_data["weight"],
                    status="in_progress" if g_data["pct"] < 100 else "achieved",
                )
                db.add(g)
        print("Configured performance OKR cycles and employee goals.")

        # 14. Recruitment / ATS Jobs & Candidates
        job = db.scalar(select(JobOpening).where(JobOpening.organization_id == org_id, JobOpening.title == "Senior Full-Stack Engineer"))
        if not job:
            job = JobOpening(
                organization_id=org_id,
                title="Senior Full-Stack Engineer",
                department_id=dept_objs["Engineering"].id,
                location="Bangalore Tech Hub",
                employment_type="full_time",
                open_positions=2,
                status="published",
                description="Looking for an experienced engineer proficient in FastAPI, PostgreSQL, and React with TypeScript.",
                requirements="5+ years building scalable SaaS applications, strong grasp of multi-tenancy, clean architecture, and REST API design.",
            )
            db.add(job)
            db.flush()

            candidates_seed = [
                {"first_name": "Siddharth", "last_name": "Rao", "email": "siddharth.rao@example.com", "phone": "+91 98333 44555", "stage": "interview"},
                {"first_name": "Kavita", "last_name": "Patel", "email": "kavita.patel@example.com", "phone": "+91 98444 55666", "stage": "offer"},
                {"first_name": "Amit", "last_name": "Choudhury", "email": "amit.c@example.com", "phone": "+91 98555 66777", "stage": "screening"},
            ]
            for c_info in candidates_seed:
                c = Candidate(
                    organization_id=org_id,
                    job_id=job.id,
                    first_name=c_info["first_name"],
                    last_name=c_info["last_name"],
                    email=c_info["email"],
                    phone=c_info["phone"],
                    stage=c_info["stage"],
                )
                db.add(c)
        print("Configured recruitment job openings and active candidates pipeline.")

        # 15. Documents & Company Policies
        docs_seed = [
            {"title": "Global Information Security Policy 2026", "category": "policy", "file_url": "https://storage.enterprisehrm.internal/policies/security-2026.pdf", "file_size_kb": 1240},
            {"title": "Employee Code of Conduct & Ethics", "category": "policy", "file_url": "https://storage.enterprisehrm.internal/policies/code-of-conduct.pdf", "file_size_kb": 850},
            {"title": "Annual Leave & Remote Work Policy", "category": "policy", "file_url": "https://storage.enterprisehrm.internal/policies/leave-policy-v2.pdf", "file_size_kb": 430},
        ]
        for d_info in docs_seed:
            d = db.scalar(select(Document).where(Document.organization_id == org_id, Document.title == d_info["title"]))
            if not d:
                d = Document(organization_id=org_id, **d_info, verification_status="verified")
                db.add(d)
        print("Uploaded enterprise policy and compliance documents.")

        # 16. Announcements
        announcements_seed = [
            {"title": "Welcome to Enterprise HRM 2.0!", "content": "Our new unified platform is live with Attendance, Leave, Payroll, Performance, and Employee Self Service modules.", "priority": "urgent"},
            {"title": "Quarterly All-Hands Meeting This Friday", "content": "Join us at 4:00 PM IST in the Town Hall virtual room to discuss product milestones and FY26 projections.", "priority": "normal"},
            {"title": "Holiday Notice: Gandhi Jayanti (Oct 2)", "content": "Please note that all branches will remain closed on Oct 2nd on account of Gandhi Jayanti.", "priority": "low"},
        ]
        for a_info in announcements_seed:
            a = db.scalar(select(Announcement).where(Announcement.organization_id == org_id, Announcement.title == a_info["title"]))
            if not a:
                a = Announcement(organization_id=org_id, published_by_id=admin_user.id, **a_info)
                db.add(a)
        print("Published enterprise announcements.")

        # 17. Audit Logs
        actions = [
            ("LOGIN", "user", str(admin_user.id), "Administrator logged in via Web UI"),
            ("CREATE", "branch", str(branch_objs[0].id), "Added Bangalore Tech Hub location"),
            ("ALLOCATE_LEAVE", "leave_balance", str(active_employees[0].id), "Allocated annual leave quotas"),
            ("PROCESS_PAYROLL", "payroll_run", str(run.id), f"Processed month {last_month}/{pr_year} payroll run"),
            ("DISBURSE_PAYROLL", "payroll_run", str(run.id), f"Approved and disbursed payslips for {len(active_employees)} employees"),
        ]
        for act, et, eid, det in actions:
            log_audit(db, org_id, admin_user.id, act, et, eid, det)

        db.commit()
        print("\nSUCCESS: All Enterprise HRM seed data committed successfully to PostgreSQL!")

    except Exception as e:
        db.rollback()
        print(f"Error during enterprise seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_enterprise_data()

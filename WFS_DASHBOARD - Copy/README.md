# REPORT Dashboard

## განახლებები და მახასიათებლები

### 🔐 ავტორიზაციის სისტემა
- დამატებულია სრული ავტორიზაციის სისტემა Flask-Login-ით
- იუზერი: **Lnukradze**
- პაროლი: **admin1177**
- "დამახსოვრება" ფუნქცია 7 დღით
- იუზერის სახელი და აიკონი ნავიგაციაში

### 💾 ფილტრების შენახვა
- ფილტრები ინახება localStorage-ში
- გვერდის refresh-ის შემდეგ ფილტრები რჩება
- ავტომატურად იტვირთება ბოლოს გამოყენებული ფილტრები
- თაბების (მონაცემები/რეპორტი) პოზიცია ინახება

### 🎨 სახელის ცვლილება
- WFS Dashboard -> REPORT Dashboard
- განახლებული ინტერფეისი და ფერები

## ინსტალაცია Render.com-ზე

### 1. პირველი: GitHub რეპოზიტორიაში ატვირთვა
```bash
# კლონირება თქვენს კომპიუტერზე
git clone https://github.com/lnukradze/reportapp.git
cd reportapp

# წაშალეთ ძველი WFS_DASHBOARD - Copy საქაღალდე
rm -rf "WFS_DASHBOARD - Copy"

# დაამატეთ ახალი ფაილები
# დააკოპირეთ ყველა ფაილი outputs საქაღალდიდან პროექტის root-ში

# Git კომიტი
git add .
git commit -m "Add authentication system and filter persistence"
git push origin main
```

### 2. Render.com კონფიგურაცია

1. შედით [render.com](https://render.com)
2. აირჩიეთ **Web Service**
3. დააკავშირეთ GitHub რეპო
4. კონფიგურაცია:
   - **Name**: report-dashboard
   - **Region**: Frankfurt (EU)
   - **Branch**: main
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`

### 3. Environment Variables

Render.com-ის dashboard-ში დაამატეთ:
```
SECRET_KEY = [თქვენი_საიდუმლო_გასაღები]
PORT = 10000
```

**SECRET_KEY გენერაცია** (Python-ში):
```python
import secrets
print(secrets.token_hex(32))
```

### 4. სტრუქტურა

```
/
├── server.py           # Flask backend ავტორიზაციით
├── requirements.txt    # Python dependencies
├── templates/
│   ├── index.html     # Dashboard გვერდი
│   └── login.html     # ავტორიზაციის გვერდი
└── static/
    ├── app.js         # JavaScript localStorage-ით
    └── style.css      # სტილები user section-ით
```

## მომხმარებლების დამატება

server.py ფაილში დაამატეთ ახალი მომხმარებლები `USERS` dictionary-ში:

```python
USERS = {
    'Lnukradze': {
        'password': generate_password_hash('admin1177'),
        'name': 'ლუკა ნუკრაძე'
    },
    'NewUser': {
        'password': generate_password_hash('new_password'),
        'name': 'ახალი მომხმარებელი'
    }
}
```

## ფუნქციონალი

- ✅ ავტორიზაცია და სესიის მართვა
- ✅ ფილტრების შენახვა localStorage-ში
- ✅ პაროლის დამახსოვრება 7 დღით
- ✅ იუზერის ინფორმაცია ნავიგაციაში
- ✅ Logout ფუნქცია
- ✅ თემის გადართვა და შენახვა
- ✅ ავტომატური მონაცემების ჩატვირთვა

## შენიშვნები

1. **უსაფრთხოება**: Production-ში გამოიყენეთ HTTPS და შეცვალეთ SECRET_KEY
2. **მონაცემთა ბაზა**: დიდი პროექტისთვის გადაიყვანეთ მომხმარებლები მონაცემთა ბაზაში
3. **Backup**: რეგულარულად შექმენით backup GitHub-ზე

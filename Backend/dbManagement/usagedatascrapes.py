import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Web page URL to scrape
URL = os.getenv('USAGE_URL')

# Set up MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME')
COLLECTION_NAME = os.getenv('USAGE_COLLECTION_NAME')

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db['usage_app']

# Set up Selenium WebDriver
options = Options()
options.add_argument('--headless')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
driver = webdriver.Chrome(options=options)

def scrape_data_and_store():
    try:
        # Load the page with Selenium
        driver.get(URL)
        time.sleep(5)  # Wait for dynamic content to load

        # Parse the page source with BeautifulSoup
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Extract all location elements
        location_elements = soup.select('.rw-c2c-feed__location')
        if not location_elements:
            print('No location elements found on the page.')
            return

        for element in location_elements:
            # Extract location name
            name = element.select_one('.rw-c2c-feed__location--name').get_text(strip=True)

            # Extract capacity information (handle null case)
            capacity_element = element.select_one('.rw-c2c-feed__about--capacity')
            capacity_text = capacity_element.get_text(strip=True).replace('Capacity: ', '') if capacity_element else 'N/A'

            # Extract last updated time (handle null case)
            last_updated_element = element.select_one('.rw-c2c-feed__about--update')
            last_updated_text = last_updated_element.get_text(strip=True).replace('Last Updated: ', '') if last_updated_element else 'N/A'

            # Update or insert the record in MongoDB
            collection.update_one(
                {'location': name},  # Find record by location
                {'$set': {
                    'capacity': capacity_text,
                    'last_updated': last_updated_text,
                    'scraped_at': datetime.utcnow(),  # Track when the update happened
                }},
                upsert=True  # Insert if not found
            )

            print(f'Updated data for: {name}')

    except Exception as e:
        print(f"Error during scraping: {e}")

    finally:
        driver.quit()

if __name__ == '__main__':
    scrape_data_and_store()

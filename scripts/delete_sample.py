#!/usr/bin/env python3

import os
import sys
import json
from pymongo import MongoClient

if len(sys.argv) < 3:
    print('Usage: delete_sample.py <config_file_path> <data_file_path>')
    sys.exit(1)

config_file_path = sys.argv[1]
data_file_path = sys.argv[2]

try:
    with open(config_file_path, 'r') as config_file:
        config = json.load(config_file)
except Exception as error:
    print('Error loading config file:', error)
    sys.exit(1)

mongo_uri = config.get('MONGO_URI')
db_name = config.get('MONGO_DB_NAME')


try:
    with open(data_file_path, 'r') as file:
        data_to_delete = json.load(file)

except Exception as error:
    print('Error loading data file:', error)
    sys.exit(1)

client = MongoClient(mongo_uri)
db = client[db_name]
collection = db['features']

def delete_data(data):
    for item in data:
        existing_feature = collection.find_one({"properties.ID": item["properties"]["ID"]})

        if existing_feature:
            collection.delete_one({"properties.ID": item["properties"]["ID"]})
            print(f'Sample with ID {item["properties"]["ID"]} deleted successfully!')
        else:
            print(f'Sample with ID {item["properties"]["ID"]} not in MIMOSA')

try:
    delete_data(data_to_delete)
except Exception as err:
    print('Error uploading data:', err)
finally:
    client.close()


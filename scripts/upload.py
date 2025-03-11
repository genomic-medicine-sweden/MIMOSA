#!/usr/bin/env python3
import json
from pymongo import MongoClient

def upload_features(config_file_path, data_file_path):
    """
    Upload the features JSON file to MIMOSA.
    """
    try:
        with open(config_file_path, 'r') as config_file:
            config = json.load(config_file)
    except Exception as error:
        print('Error loading config file:', error)
        return

    mongo_uri = config.get('MONGO_URI')
    db_name = config.get('MONGO_DB_NAME')

    try:
        with open(data_file_path, 'r') as file:
            data_to_upload = json.load(file)
    except Exception as error:
        print('Error loading data file:', error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['features']

    def upload_data(data):
        for item in data:
            existing_feature = collection.find_one({"properties.ID": item["properties"]["ID"]})
            if existing_feature:
                print(f"Sample with ID {item['properties']['ID']} already uploaded")
            else:
                collection.insert_one(item)
                print(f"Sample with ID {item['properties']['ID']} uploaded successfully!")

    try:
        upload_data(data_to_upload)
    except Exception as err:
        print('Error uploading data:', err)
    finally:
        client.close()
def upload_clustering(config_file_path, data_file_path):
    """
    Upload the clustering results to MIMOSA
    """
    try:
        with open(config_file_path, 'r') as config_file:
            config = json.load(config_file)
    except Exception as error:
        print("Error loading config file:", error)
        return

    mongo_uri = config.get("MONGO_URI")
    db_name = config.get("MONGO_DB_NAME")

    try:
        with open(data_file_path, 'r') as file:
            clustering_data = json.load(file)
    except Exception as error:
        print("Error loading clustering data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['clustering']

    try:
        collection.insert_one(clustering_data)
        print("Clustering result uploaded successfully!")
    except Exception as err:
        print("Error uploading clustering data:", err)
    finally:
        client.close()

def upload_similarity(config_file_path, data_file_path):
    """
    Upload similarity results to MIMOSA
    """
    try:
        with open(config_file_path, 'r') as config_file:
            config = json.load(config_file)
    except Exception as error:
        print("Error loading config file:", error)
        return

    mongo_uri = config.get("MONGO_URI")
    db_name = config.get("MONGO_DB_NAME")

    try:
        with open(data_file_path, 'r') as file:
            similarity_data = json.load(file)
    except Exception as error:
        print("Error loading similarity data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['similarities']

    def upload_data(data):
        for item in data:
            existing_similarity = collection.find_one({"ID": item["ID"]})
            if existing_similarity:
                print(f"Similarity data for ID {item['ID']} already uploaded")
            else:
                collection.insert_one(item)
                print(f"Similarity data for ID {item['ID']} uploaded successfully!")

    try:
        upload_data(similarity_data)
    except Exception as err:
        print("Error uploading similarity data:", err)
    finally:
        client.close()

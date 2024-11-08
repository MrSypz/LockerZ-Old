from flask import Flask, request, jsonify, send_from_directory, render_template, url_for
import json
import os
import threading
import shutil

app = Flask(__name__, static_folder='public', template_folder='public')

def get_folder_path():
    try:
        config_path = os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'lockerz', 'config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as config_file:
                config = json.load(config_file)
                return config.get('folderPath', os.path.join(os.path.expanduser('~'), 'LockerZ'))  # Default path if not found
        return os.path.join(os.path.expanduser('~'), 'LockerZ')  # Fallback if config is missing
    except Exception as e:
        return os.path.join(os.path.expanduser('~'), 'LockerZ')  # Fallback path if reading the config fails

folder_path = get_folder_path()

@app.route('/get_folder_path', methods=['GET'])
def get_folder_path_route():
    return jsonify({'folderPath': folder_path})


@app.route('/update_folder_path', methods=['POST'])
def update_folder_path():
    global folder_path
    new_folder_path = request.json.get('folder_path')

    if new_folder_path and os.path.exists(new_folder_path):
        folder_path = new_folder_path  # Update the global folder path
        return jsonify(success=True)
    else:
        return jsonify(success=False, message="Invalid path or path does not exist"), 400

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/form/setfolder')
def setfolder():
    return render_template('form/setfolder.html', folder_path=folder_path)

@app.route('/set_folder', methods=['POST'])
def set_folder():
    global folder_path
    new_folder_path = request.form['folder_path']

    if not os.path.exists(new_folder_path):
        try:
            os.makedirs(new_folder_path)
            folder_path = new_folder_path
            return redirect(url_for('setfolder'))
        except Exception as e:
            return f"Error creating folder: {e}"
    else:
        folder_path = new_folder_path
        return redirect(url_for('setfolder'))

    
@app.route('/form/locker')
def locker():
    return render_template('form/locker.html')  # Point to the locker.html in the form folder

@app.route('/form/category')
def category():
    return render_template('form/category.html')
    
@app.route('/create_category', methods=['POST'])
def create_category():
    category = request.json.get('category')
    category_path = os.path.join(folder_path, category)

    if not os.path.exists(category_path):
        os.makedirs(category_path)
        return jsonify(success=True, message="Category created"), 201
    return jsonify(success=False, message="Category already exists"), 400


@app.route('/rename_category', methods=['POST'])
def rename_category():
    data = request.json
    old_category = data.get('oldCategory')
    new_category = data.get('newCategory')

    old_category_path = os.path.join(folder_path, old_category)
    new_category_path = os.path.join(folder_path, new_category)

    if os.path.exists(old_category_path) and not os.path.exists(new_category_path):
        os.rename(old_category_path, new_category_path)  # Rename the folder
        return jsonify(success=True), 200
    else:
        return jsonify(success=False, message="Category does not exist or new category name already exists."), 400

@app.route('/files/<path:category>/<path:filename>', methods=['GET'])
def serve_file(category, filename):
    category_path = os.path.join(folder_path, category)
    return send_from_directory(category_path, filename)

@app.route('/categories', methods=['GET'])
def get_categories():
    try:
        categories = []
        for name in os.listdir(folder_path):
            dir_path = os.path.join(folder_path, name)
            if os.path.isdir(dir_path): 
                categories.append(name)

        return jsonify({"categories": categories}) 
    except Exception as e:
        return jsonify({"error": str(e)}), 500  

@app.route('/images', methods=['GET'])
def get_images():
    category = request.args.get('category')
    category_path = os.path.join(folder_path, category)

    if os.path.exists(category_path):
        images = [f for f in os.listdir(category_path) if os.path.isfile(os.path.join(category_path, f))]
        images.sort(key=lambda x: os.path.getmtime(os.path.join(category_path, x)), reverse=True)

        return jsonify(images=images)
    return jsonify(images=[]), 404

@app.route('/delete_image', methods=['DELETE'])
def delete_image():
    data = request.json
    file_name = data.get('fileName')
    category = data.get('category')  # Send the category separately

    image_path = os.path.join(folder_path, category, file_name)

    if os.path.exists(image_path):
        os.remove(image_path)  # Delete the image file
        return jsonify(success=True), 200
    return jsonify(success=False, message="Image not found"), 404


@app.route('/delete_category', methods=['DELETE'])
def delete_category():
    category = request.json.get('category')
    category_path = os.path.join(folder_path, category)

    if os.path.exists(category_path) and os.path.isdir(category_path):
        os.rmdir(category_path)  # Remove the category directory
        return jsonify(success=True), 200
    return jsonify(success=False, message="Category not found"), 404


# css lookup
@app.context_processor
def inject_static():
    return dict(lookup=url_for('static', filename=''))

def run_flask():
    app.run(port=5000, debug=False, use_reloader=False, threaded=True)  # Run Flask app

if __name__ == '__main__':
    threading.Thread(target=run_flask).start()  # Start Flask in a separate thread
import json
import base64
import struct
import os

def export_animations():
    gltf_path = 'model/character.gltf'
    output_path = 'animations.json'
    
    if not os.path.exists(gltf_path):
        print(f"Error: {gltf_path} not found.")
        return

    with open(gltf_path, 'r') as f:
        gltf = json.load(f)

    if 'animations' not in gltf:
        print("No animations found in glTF.")
        return

    buffers = []
    for buf in gltf.get('buffers', []):
        uri = buf.get('uri', '')
        if uri.startswith('data:application/octet-stream;base64,'):
            data = base64.b64decode(uri.split(',')[1])
            buffers.append(data)
        else:
            # Fallback for external files if any
            if os.path.exists(os.path.join('model', uri)):
                with open(os.path.join('model', uri), 'rb') as bf:
                    buffers.append(bf.read())
            else:
                buffers.append(None)

    def get_accessor_data(accessor_idx):
        accessor = gltf['accessors'][accessor_idx]
        buffer_view = gltf['bufferViews'][accessor['bufferView']]
        buffer_data = buffers[buffer_view['buffer']]
        
        offset = buffer_view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        count = accessor['count']
        comp_type = accessor['componentType'] # 5126 is FLOAT
        type_str = accessor['type'] # SCALAR, VEC3, VEC4
        
        num_components = {
            'SCALAR': 1,
            'VEC2': 2,
            'VEC3': 3,
            'VEC4': 4
        }[type_str]
        
        # 5126 is float, 4 bytes
        if comp_type == 5126:
            fmt = '<' + ('f' * num_components)
            stride = buffer_view.get('byteStride', num_components * 4)
            data = []
            for i in range(count):
                item = struct.unpack_from(fmt, buffer_data, offset + i * stride)
                if num_components == 1:
                    data.append(item[0])
                else:
                    data.extend(item)
            return data
        return []

    exported_animations = []
    
    # We need node names to map nodes to tracks
    nodes = gltf.get('nodes', [])
    
    for anim in gltf['animations']:
        anim_json = {
            'name': anim.get('name', 'Animation'),
            'tracks': []
        }
        
        max_time = 0
        
        for channel in anim['channels']:
            sampler = anim['samplers'][channel['sampler']]
            target = channel['target']
            node_idx = target['node']
            path = target['path']
            
            node_name = nodes[node_idx].get('name', f"node_{node_idx}")
            
            times = get_accessor_data(sampler['input'])
            values = get_accessor_data(sampler['output'])
            
            if times:
                max_time = max(max_time, max(times))
            
            # Map glTF path to Three.js track name
            # Three.js usually expects "nodeName.position", "nodeName.quaternion", "nodeName.scale"
            track_path = ""
            if path == 'translation': track_path = 'position'
            elif path == 'rotation': track_path = 'quaternion'
            elif path == 'scale': track_path = 'scale'
            
            track_type = ""
            if path == 'translation': track_type = 'vector'
            elif path == 'rotation': track_type = 'quaternion'
            elif path == 'scale': track_type = 'vector'
            
            anim_json['tracks'].append({
                'name': f"{node_name}.{track_path}",
                'type': track_type,
                'times': times,
                'values': values
            })
            
        anim_json['duration'] = max_time
        exported_animations.append(anim_json)

    with open(output_path, 'w') as f:
        json.dump(exported_animations, f, indent=2)
    
    print(f"Successfully exported {len(exported_animations)} animations to {output_path}")

if __name__ == "__main__":
    export_animations()

# Made with ❤️ from 4SP

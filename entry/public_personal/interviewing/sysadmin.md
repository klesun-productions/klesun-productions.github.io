
## SysAdmin questions If more than 10 years of experience

- What is the difference between SSD and HDD
    - HDD has a physically rotating disk where data is read/written with a laser. SSD uses unmovable components for storing data

- What is the difference between 32-bit and 64-bit systems?
    - 32-bit limit is 4 GiB of RAM

- What is bad blocks
    - Parts of the hard drive that are physically corrupted. An indication that device should be replaced.

- What is fragmentation/defragmentation?
    - when part of file is in one end of hard drive and another on another end

- Could you tell me what you know about NTFS, FAT32 and ext4 file systems?
    - NTFS is a proprietary file system used by windows. FAT32 is mostly used by SD cards, has a limit of 4 GiB per file. Ext4 is a linux file system with logging that uses some smart algorithm for distribution of data that prevents fragmentation.

## SysAdmin questions
- What is BitLocker
    - Disk encryption

- What does ping terminal command do?
    - It checks whether there is a live server listening for connections on the specified IP address.

- What is localhost?
    - The alias for the 127.0.0.1 IP which points to the machine from which it is requested

- What are advantages and disadvantages of 5 GHz wifi vs 2.4 GHz wifi?
    - 5 Ghz has higher throughput, but lower range

- What is the difference between http and https?
    - https uses ssl certificates to encrypt and sign requests and responses therefore protecting the contents of communication between server and client from ISPs

- Can you describe the principle of public/private key encryption?
    - When you want to securely send some data, you encrypt it with recipient's public key and then only that specific recipient can decrypt it using his private key. Likewise, recipient can encrypt some data with his private key and then anyone will be able to descrypt it with his public key proving that data was indeed sent by that recipient.

- What is the difference between TCP and UDP protocols?
    - TCP waits for confirmation of delivered data, UDP does not.

- What is sha256
    - A hashing algorithm

- What http status codes do you know by heart?
    - 400 Bad Request, 401 Unauthorized, 403 Forbidden, 200 Success, 300 Redirect, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error, 501 Not Implemented, 502 Bad Gateway


## Advanced
- What is latency
    - The time request spends going to server and back. The closer client is geographically to the server the lower is usually the latency. From Europe to America on best connection it is usually 170 ms.


## If M365 background
- What is intune?

- What is Azure platform?

- What is SharePoint?


## If has Linux background

- What is sudo
    - Executes next command as administrator

- What is chmod 777 command in Linux
    - chmod changes what kind of users can read/write/execute the file. 777 is usually a very bad idea since it gives full access to the file to guest users who may, for example, have connected via samba

- What is ssh
    - A command that lets you remotely connect to a linux server to execute terminal commands.

- What is the GNU General Public License
    - It is the license that allows you to use the licensed software under the condition that you will make your own software open source.
- What programming language is Linux kernel written on?
    - C
- What command do you use in terminal to list files in current directory?
    - ls
- What command do you use to go into a directory?
    - cd


#Overview

The purpose of group is to provide multiple users share a common namespace.All users in this group can pull and push images from registry.

#Create A Group

Before use this function, you should create a group. 
    
    ```
    curl -ubjchenxl@cn.ibm.com -X POST -d groupname=bird registry.cdl.ibm.com/groups
    ```

you should replace the mail and groupname yourself


#Add Other User To Group

After create a group, you can add others to this group.

    ```
    curl -ubjchenxl@cn.ibm.com -X PUT registry.cdl.ibm.com/groups/bird/members/tanjiang@cn.ibm.com/permission/admin
    ```

This command can add tanjiang@cn.ibm.com to the group named bird. Then he can pull and push images from bird namespace.

#Delete Users In Group

If you want to delete a user in your group.

    ```
    curl -ubjchenxl@cn.ibm.com -X DELETE registry.cdl.ibm.com/groups/bird/members/tanjiang@cn.ibm.com
    ```

If you create this group or your permission is admin in this group, you can delete others.

#Delete Group

    ```
    curl -ubjchenxl@cn.ibm.com -X DELETE registry.cdl.ibm.com/groups/bird
    ```

Only the one who create this group has the permission to delete.